import { useState, useCallback, useRef, useEffect } from 'react';
import type { SimulationParameters, SearchProgress, GridState, ClassicalGridState, PauliCoefficients, Complex } from '../types';
import { performQuantumStep, performGOLStep, getClassicalState } from '../simulation';

// --- GA Constants ---
const POPULATION_SIZE = 50;
const MUTATION_RATE = 0.1;
const MUTATION_AMOUNT = 0.1; // How much to mutate by
const CROSSOVER_RATE = 0.7;
const ELITISM_COUNT = 2; // Keep the best N individuals
const FITNESS_SIM_STEPS = 15;
const FITNESS_GRID_SIZE = 32;
const POPULATION_PENALTY_WEIGHT = 1.5;
const DYNAMISM_ERROR_WEIGHT = 1.0; // Penalty for mismatching the character of dynamism
const DYNAMISM_BONUS_MULTIPLIER = 1.5; // "Spark of life" bonus for not stagnating
const STAGNATION_CHECK_LENGTH = 4; // How many steps of no flips to count as stagnant
const SELECTION_NOISE_PROBABILITY = 0.1; // 10% chance to pick the weaker contestant to escape local optima

// --- Randomness Sources ---
// A dedicated seeded generator for creating the deterministic "ground truth" fitness test.
const createSeededRandom = (seed: number) => {
    let s = seed;
    return () => {
        const x = Math.sin(s++) * 10000;
        return x - Math.floor(x);
    };
};
const SEED = 1337;


// --- Trajectory Type ---
interface TrajectoryStep {
    grid: ClassicalGridState;
    population: number;
    flipsSincePrevStep: number;
}

const createQubitGridFromClassical = (classical: number[][]): GridState => {
    if (classical.length === 0 || classical[0].length === 0) {
        return [];
    }
    const height = classical.length;
    const width = classical[0].length;
    const grid: GridState = Array.from({ length: height }, () => 
        Array.from({ length: width }, () => [{ re: 1, im: 0 }, { re: 0, im: 0 }])
    );
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (classical[y][x] === 1) {
                grid[y][x] = [{ re: 0, im: 0 }, { re: 1, im: 0 }]; // |1>
            }
        }
    }
    return grid;
};

export const useRuleSearch = () => {
    const [isSearching, setIsSearching] = useState(false);
    const [searchProgress, setSearchProgress] = useState<SearchProgress>({ generation: 0, bestFitness: 0 });
    const [bestParams, setBestParams] = useState<SimulationParameters | null>(null);

    const populationRef = useRef<SimulationParameters[]>([]);
    const generationRef = useRef<number>(0);
    const timeoutRef = useRef<number | null>(null);
    const groundTruthTrajectoryRef = useRef<TrajectoryStep[]>([]);
    
    // --- GA Operators using Math.random() for stochastic evolution ---
    const randomCoeff = () => (Math.random() - 0.5) * 0.2; // Small initial random values

    const createRandomCoefficients = (): PauliCoefficients => ({
        cI: { re: randomCoeff(), im: randomCoeff() },
        cX: { re: randomCoeff(), im: randomCoeff() },
        cY: { re: randomCoeff(), im: randomCoeff() },
        cZ: { re: randomCoeff(), im: randomCoeff() },
    });
    
    const createRandomParams = (): SimulationParameters => ({
        gamma: 1.0,
        // Start w_self near identity
        w_self: {
            cI: { re: 1 + randomCoeff(), im: randomCoeff() },
            cX: { re: randomCoeff(), im: randomCoeff() },
            cY: { re: randomCoeff(), im: randomCoeff() },
            cZ: { re: randomCoeff(), im: randomCoeff() },
        },
        w_neighbor: createRandomCoefficients(),
    });

    const calculateFitness = useCallback((params: SimulationParameters): number => {
        let mismatchError = 0;
        let populationError = 0;
        let dynamismError = 0;
        const candidateDynamismHistory: number[] = [];

        if (groundTruthTrajectoryRef.current.length === 0) return 0;

        const initialGrid = groundTruthTrajectoryRef.current[0].grid;
        let quantumGrid = createQubitGridFromClassical(initialGrid);
        let prevClassicalGrid = initialGrid;

        for (let step = 0; step < FITNESS_SIM_STEPS; step++) {
            quantumGrid = performQuantumStep(quantumGrid, { ...params, gamma: 1.0 });
            const candidateClassicalGrid = quantumGrid.map(row => row.map(getClassicalState));
            const groundTruthStep = groundTruthTrajectoryRef.current[step + 1];

            let candidatePopulation = 0;
            let candidateFlips = 0;
            for (let y = 0; y < FITNESS_GRID_SIZE; y++) {
                for (let x = 0; x < FITNESS_GRID_SIZE; x++) {
                    const cellState = candidateClassicalGrid[y][x];
                    mismatchError += Math.abs(cellState - groundTruthStep.grid[y][x]);
                    candidatePopulation += cellState;
                    if (cellState !== prevClassicalGrid[y][x]) {
                        candidateFlips++;
                    }
                }
            }
            populationError += Math.abs(candidatePopulation - groundTruthStep.population);
            dynamismError += Math.abs(candidateFlips - groundTruthStep.flipsSincePrevStep);
            candidateDynamismHistory.push(candidateFlips);
            prevClassicalGrid = candidateClassicalGrid;
        }
        
        const totalError = mismatchError 
                         + populationError * POPULATION_PENALTY_WEIGHT
                         + dynamismError * DYNAMISM_ERROR_WEIGHT;
        let fitness = 1 / (1 + totalError);

        // "Spark of Life" bonus for sustained dynamism.
        let isStagnant = false;
        if (candidateDynamismHistory.length >= STAGNATION_CHECK_LENGTH) {
            const lastSlice = candidateDynamismHistory.slice(-STAGNATION_CHECK_LENGTH);
            if (lastSlice.every(flips => flips === 0)) {
                isStagnant = true;
            }
        }

        if (!isStagnant) {
            fitness *= DYNAMISM_BONUS_MULTIPLIER;
        }

        return fitness;
    }, []);

    const mutateCoefficients = (coeffs: PauliCoefficients): PauliCoefficients => {
        const mutateComplex = (c: Complex): Complex => {
            let { re, im } = c;
            if (Math.random() < MUTATION_RATE) re += (Math.random() - 0.5) * 2 * MUTATION_AMOUNT;
            if (Math.random() < MUTATION_RATE) im += (Math.random() - 0.5) * 2 * MUTATION_AMOUNT;
            return { re, im };
        };
        return {
            cI: mutateComplex(coeffs.cI),
            cX: mutateComplex(coeffs.cX),
            cY: mutateComplex(coeffs.cY),
            cZ: mutateComplex(coeffs.cZ),
        };
    };

    const mutate = (params: SimulationParameters): SimulationParameters => {
        return {
            gamma: 1.0,
            w_self: mutateCoefficients(params.w_self),
            w_neighbor: mutateCoefficients(params.w_neighbor),
        };
    };

    const crossoverCoefficients = (p1: PauliCoefficients, p2: PauliCoefficients): PauliCoefficients => ({
        cI: Math.random() < 0.5 ? p1.cI : p2.cI,
        cX: Math.random() < 0.5 ? p1.cX : p2.cX,
        cY: Math.random() < 0.5 ? p1.cY : p2.cY,
        cZ: Math.random() < 0.5 ? p1.cZ : p2.cZ,
    });

    const crossover = (parent1: SimulationParameters, parent2: SimulationParameters): SimulationParameters => {
        return {
            gamma: 1.0,
            w_self: crossoverCoefficients(parent1.w_self, parent2.w_self),
            w_neighbor: crossoverCoefficients(parent1.w_neighbor, parent2.w_neighbor),
        };
    };

    const runGeneration = useCallback(() => {
        generationRef.current++;
        const fitnessScores = populationRef.current.map(p => ({ params: p, fitness: calculateFitness(p) }));
        fitnessScores.sort((a, b) => b.fitness - a.fitness);

        const bestIndividual = fitnessScores[0];
        
        const currentBestFitness = bestParams ? searchProgress.bestFitness : -1;
        if (bestIndividual.fitness > currentBestFitness + 1e-9) {
            setBestParams(bestIndividual.params);
            setSearchProgress({ generation: generationRef.current, bestFitness: bestIndividual.fitness });
        } else {
            setSearchProgress(prev => ({ ...prev, generation: generationRef.current }));
        }

        if (bestIndividual.fitness > 1.49) {
            setIsSearching(false);
            return;
        }

        const newPopulation: SimulationParameters[] = [];
        for (let i = 0; i < ELITISM_COUNT; i++) {
            newPopulation.push(fitnessScores[i].params);
        }

        const selectParent = (): SimulationParameters => {
            const contestant1 = fitnessScores[Math.floor(Math.random() * fitnessScores.length)];
            const contestant2 = fitnessScores[Math.floor(Math.random() * fitnessScores.length)];
            
            const [winner, loser] = contestant1.fitness > contestant2.fitness 
                ? [contestant1, contestant2] 
                : [contestant2, contestant1];

            if (Math.random() < SELECTION_NOISE_PROBABILITY) {
                return loser.params;
            }
            return winner.params;
        };

        while (newPopulation.length < POPULATION_SIZE) {
            const parent1 = selectParent();
            const parent2 = selectParent();

            let child: SimulationParameters;
            if (Math.random() < CROSSOVER_RATE) {
                child = crossover(parent1, parent2);
            } else {
                child = JSON.parse(JSON.stringify(parent1));
            }
            child = mutate(child);
            newPopulation.push(child);
        }
        populationRef.current = newPopulation;
        
        timeoutRef.current = window.setTimeout(runGeneration, 20);
    }, [calculateFitness, bestParams, searchProgress]);

    const precomputeGroundTruth = useCallback(() => {
        const seededRandomForGroundTruth = createSeededRandom(SEED);
        let grid: ClassicalGridState = Array.from({ length: FITNESS_GRID_SIZE }, () =>
            Array.from({ length: FITNESS_GRID_SIZE }, () => (seededRandomForGroundTruth() > 0.6 ? 1 : 0))
        );
        
        const trajectory: TrajectoryStep[] = [];
        let population = grid.flat().reduce((a, b) => a + b, 0);
        trajectory.push({ grid: grid.map(row => [...row]), population, flipsSincePrevStep: 0 });

        let prevGrid = grid.map(row => [...row]);

        for(let i = 0; i < FITNESS_SIM_STEPS; i++) {
            grid = performGOLStep(grid);
            population = grid.flat().reduce((a, b) => a + b, 0);
            
            let flips = 0;
            for (let y = 0; y < FITNESS_GRID_SIZE; y++) {
                for (let x = 0; x < FITNESS_GRID_SIZE; x++) {
                    if (grid[y][x] !== prevGrid[y][x]) {
                        flips++;
                    }
                }
            }
            
            trajectory.push({ grid: grid.map(row => [...row]), population, flipsSincePrevStep: flips });
            prevGrid = grid.map(row => [...row]);
        }
        groundTruthTrajectoryRef.current = trajectory;
    }, []);

    useEffect(() => {
        if (isSearching) {
            timeoutRef.current = window.setTimeout(runGeneration, 20);
        } else {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isSearching, runGeneration]);

    const initializeSearch = useCallback(() => {
        generationRef.current = 0;
        precomputeGroundTruth();
        populationRef.current = Array.from({ length: POPULATION_SIZE }, createRandomParams);
        setSearchProgress({ generation: 0, bestFitness: 0 });
        setBestParams(null);
    }, [precomputeGroundTruth, createRandomParams]);

    const toggleSearch = useCallback(() => {
        if (!isSearching && generationRef.current === 0) {
            initializeSearch();
        }
        setIsSearching(prev => !prev);
    }, [isSearching, initializeSearch]);
    
    const resetSearch = useCallback(() => {
        setIsSearching(false);
        initializeSearch();
    }, [initializeSearch]);

    useEffect(() => {
        resetSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    return { isSearching, toggleSearch, resetSearch, searchProgress, bestParams };
};