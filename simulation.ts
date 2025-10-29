import type { GridState, QubitState, SimulationParameters, Complex, ClassicalGridState, PauliCoefficients } from './types';

// --- Complex Number Math ---
const cadd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
const cmul = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });

// --- Matrix Helpers ---
const applyMatrix = (mat: [Complex, Complex][], q: QubitState): QubitState => {
  const [a, b] = q;
  return [
    cadd(cmul(mat[0][0], a), cmul(mat[0][1], b)),
    cadd(cmul(mat[1][0], a), cmul(mat[1][1], b)),
  ];
};

const normalizeQubit = (q: QubitState): QubitState => {
    const [alpha, beta] = q;
    const magSq = alpha.re * alpha.re + alpha.im * alpha.im + beta.re * beta.re + beta.im * beta.im;
    if (magSq < 1e-12) {
        return [{ re: 1, im: 0 }, { re: 0, im: 0 }]; // Return |0> if magnitude is zero
    }
    const mag = Math.sqrt(magSq);
    return [
        { re: alpha.re / mag, im: alpha.im / mag },
        { re: beta.re / mag, im: beta.im / mag }
    ];
};

// --- Pauli Matrices ---
const I: [Complex, Complex][] = [[{ re: 1, im: 0 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: 1, im: 0 }]];
const X: [Complex, Complex][] = [[{ re: 0, im: 0 }, { re: 1, im: 0 }], [{ re: 1, im: 0 }, { re: 0, im: 0 }]];
const Y: [Complex, Complex][] = [[{ re: 0, im: 0 }, { re: 0, im: -1 }], [{ re: 0, im: 1 }, { re: 0, im: 0 }]];
const Z: [Complex, Complex][] = [[{ re: 1, im: 0 }, { re: 0, im: 0 }], [{ re: 0, im: 0 }, { re: -1, im: 0 }]];

// Helper to scale a matrix by a complex scalar
const scaleMatrix = (mat: [Complex, Complex][], s: Complex): [Complex, Complex][] => {
    return mat.map(row => row.map(cell => cmul(cell, s))) as [Complex, Complex][];
};

// Helper to add two matrices
const addMatrices = (mat1: [Complex, Complex][], mat2: [Complex, Complex][]): [Complex, Complex][] => {
    return mat1.map((row, i) => row.map((cell, j) => cadd(cell, mat2[i][j]))) as [Complex, Complex][];
};

const constructMatrix = (coeffs: PauliCoefficients): [Complex, Complex][] => {
    let m = scaleMatrix(I, coeffs.cI);
    m = addMatrices(m, scaleMatrix(X, coeffs.cX));
    m = addMatrices(m, scaleMatrix(Y, coeffs.cY));
    m = addMatrices(m, scaleMatrix(Z, coeffs.cZ));
    return m;
};

export const getClassicalState = (q: QubitState): number => {
    const prob1 = q[1].re * q[1].re + q[1].im * q[1].im;
    return prob1 >= 0.5 ? 1 : 0;
};

export const performQuantumStep = (currentGrid: GridState, params: SimulationParameters): GridState => {
    const gridHeight = currentGrid.length;
    const gridWidth = currentGrid[0].length;
    
    const W_self = constructMatrix(params.w_self);
    const W_neighbor = constructMatrix(params.w_neighbor);

    // Stage A: Coherent local update based on linear combination of quantum states
    const coherentlyEvolvedGrid: GridState = currentGrid.map((row, y) => 
        row.map((qubit, x) => {
            // 1. Sum neighbor states into a single vector
            let sumNeighborState: QubitState = [{ re: 0, im: 0 }, { re: 0, im: 0 }];
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    const ny = (y + i + gridHeight) % gridHeight;
                    const nx = (x + j + gridWidth) % gridWidth;
                    const neighborQubit = currentGrid[ny][nx];
                    sumNeighborState[0] = cadd(sumNeighborState[0], neighborQubit[0]);
                    sumNeighborState[1] = cadd(sumNeighborState[1], neighborQubit[1]);
                }
            }

            // 2. Apply linear combination of operators on states
            const selfTerm = applyMatrix(W_self, qubit);
            const neighborTerm = applyMatrix(W_neighbor, sumNeighborState);
            
            const nextStateVector: QubitState = [
                cadd(selfTerm[0], neighborTerm[0]),
                cadd(selfTerm[1], neighborTerm[1]),
            ];
            
            // 3. Normalize the resulting vector to be a valid qubit state
            return normalizeQubit(nextStateVector);
        })
    );

    // Stage B: Local decoherence + thresholding
    const nextGrid: GridState = coherentlyEvolvedGrid.map(row => 
        row.map(qubit => {
            const pQuantum = qubit[1].re * qubit[1].re + qubit[1].im * qubit[1].im;
            const classicalAttractor = pQuantum >= 0.5 ? 1 : 0;
            const pFinal = (1 - params.gamma) * pQuantum + params.gamma * classicalAttractor;

            const prob = Math.max(0, Math.min(1, pFinal));
            return [
                { re: Math.sqrt(1 - prob), im: 0 },
                { re: Math.sqrt(prob), im: 0 }
            ];
        })
    );
    
    return nextGrid;
};


export const performGOLStep = (grid: ClassicalGridState): ClassicalGridState => {
    const gridHeight = grid.length;
    const gridWidth = grid[0].length;
    const nextGrid: ClassicalGridState = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));

    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            let neighborCount = 0;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    const ny = (y + i + gridHeight) % gridHeight;
                    const nx = (x + j + gridWidth) % gridWidth;
                    neighborCount += grid[ny][nx];
                }
            }
            
            const cell = grid[y][x];
            if (cell === 1 && (neighborCount === 2 || neighborCount === 3)) {
                nextGrid[y][x] = 1; // Survival
            } else if (cell === 0 && neighborCount === 3) {
                nextGrid[y][x] = 1; // Birth
            } else {
                nextGrid[y][x] = 0; // Death
            }
        }
    }
    return nextGrid;
};
