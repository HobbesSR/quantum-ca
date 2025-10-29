import { useState, useCallback, useRef, useEffect } from 'react';
import { GRID_WIDTH, GRID_HEIGHT, DEFAULT_PARAMETERS, PATTERNS } from '../constants';
import { type GridState, type SimulationParameters, Pattern } from '../types';
import { performQuantumStep } from '../simulation';

const createEmptyGrid = (): GridState => {
  return Array.from({ length: GRID_HEIGHT }, () =>
    Array.from({ length: GRID_WIDTH }, () => [{ re: 1, im: 0 }, { re: 0, im: 0 }]) // All cells start as |0>
  );
};

export const useQuantumLife = () => {
  const [grid, setGrid] = useState<GridState>(() => createEmptyGrid());
  const [generation, setGeneration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [params, setParams] = useState<SimulationParameters>(DEFAULT_PARAMETERS);

  // Fix: Initialize useRef with null. The `useRef` hook requires an initial value.
  const animationFrameId = useRef<number | null>(null);

  const simulationStep = useCallback(() => {
    setGrid(currentGrid => performQuantumStep(currentGrid, params));
    setGeneration(g => g + 1);
  }, [params]);
  
  const runSimulation = useCallback(() => {
    simulationStep();
    animationFrameId.current = requestAnimationFrame(runSimulation);
  }, [simulationStep]);

  useEffect(() => {
    if (isRunning) {
      runSimulation();
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, runSimulation]);

  const resetGrid = useCallback((pattern: Pattern) => {
    setIsRunning(false);
    setGeneration(0);
    let newGrid = createEmptyGrid();

    if (pattern === Pattern.RANDOM) {
        newGrid = newGrid.map(row => row.map(() => Math.random() > 0.7 ? [{re: 0, im: 0}, {re: 1, im: 0}] : [{re: 1, im: 0}, {re: 0, im: 0}]));
    } else if (pattern !== Pattern.CLEAR) {
        const patternData = PATTERNS[pattern];
        const patternHeight = patternData.length;
        const patternWidth = patternData[0].length;
        const startY = Math.floor((GRID_HEIGHT - patternHeight) / 2);
        const startX = Math.floor((GRID_WIDTH - patternWidth) / 2);

        for (let y = 0; y < patternHeight; y++) {
            for (let x = 0; x < patternWidth; x++) {
                if (patternData[y][x] === 1) {
                    newGrid[startY + y][startX + x] = [{ re: 0, im: 0 }, { re: 1, im: 0 }]; // |1>
                }
            }
        }
    }
    setGrid(newGrid);
  }, []);

  return { grid, generation, isRunning, setIsRunning, simulationStep, resetGrid, params, setParams };
};
