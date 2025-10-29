import { SimulationParameters, Pattern, Complex } from './types';

export const GRID_WIDTH = 128;
export const GRID_HEIGHT = 128;

const ZERO_C: Complex = { re: 0, im: 0 };
const ONE_C: Complex = { re: 1, im: 0 };

export const DEFAULT_PARAMETERS: SimulationParameters = {
  gamma: 1.0,
  // w_self defaults to Identity (I = 1*I + 0*X + 0*Y + 0*Z)
  w_self: {
    cI: ONE_C,
    cX: ZERO_C,
    cY: ZERO_C,
    cZ: ZERO_C,
  },
  // w_neighbor defaults to zero, so no neighbor influence initially
  w_neighbor: {
    cI: ZERO_C,
    cX: ZERO_C,
    cY: ZERO_C,
    cZ: ZERO_C,
  },
};

export const PATTERNS: Record<Pattern, number[][]> = {
  [Pattern.RANDOM]: [], // Handled separately
  [Pattern.CLEAR]: [], // Handled separately
  [Pattern.GLIDER]: [
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1],
  ],
  [Pattern.LWSS]: [
    [1, 0, 0, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
  ],
  [Pattern.BLINKER]: [
    [1, 1, 1],
  ],
};
