export interface Complex {
  re: number; // real part
  im: number; // imaginary part
}

// Represents [alpha, beta] for the state alpha|0> + beta|1>
export type QubitState = [Complex, Complex];

export type GridState = QubitState[][];
export type ClassicalGridState = number[][];

// Coefficients for a matrix in the Pauli basis (M = cI*I + cX*X + cY*Y + cZ*Z)
export interface PauliCoefficients {
    cI: Complex;
    cX: Complex;
    cY: Complex;
    cZ: Complex;
}

// Parameters are now two matrices, one for the cell itself and one for neighbors
export interface SimulationParameters {
  gamma: number;
  w_self: PauliCoefficients;
  w_neighbor: PauliCoefficients;
}

export enum Pattern {
  RANDOM = 'Random',
  GLIDER = 'Glider',
  LWSS = 'Lightweight Spaceship',
  BLINKER = 'Blinker',
  CLEAR = 'Clear'
}

export interface SearchProgress {
    generation: number;
    bestFitness: number;
}

export type MatrixType = 'w_self' | 'w_neighbor';
export type CoeffPart = 're' | 'im';
