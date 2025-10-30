import { useCallback, useMemo, useState } from 'react';
import { PATTERNS } from '../constants';
import { Pattern, type ClassicalGridState } from '../types';
import { performGOLStep } from '../simulation';

const GRID_SIZE = 32;

const createGrid = (fill = 0): ClassicalGridState =>
  Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(fill));

const cloneGrid = (grid: ClassicalGridState): ClassicalGridState =>
  grid.map(row => [...row]);

const placePattern = (pattern: number[][]): ClassicalGridState => {
  const base = createGrid(0);
  if (pattern.length === 0) {
    return base;
  }
  const patternHeight = pattern.length;
  const patternWidth = pattern[0].length;
  const startY = Math.floor((GRID_SIZE - patternHeight) / 2);
  const startX = Math.floor((GRID_SIZE - patternWidth) / 2);

  for (let y = 0; y < patternHeight; y++) {
    for (let x = 0; x < patternWidth; x++) {
      if (pattern[y][x] === 1) {
        base[startY + y][startX + x] = 1;
      }
    }
  }
  return base;
};

export const useReversibleLife = () => {
  const [systemGrid, setSystemGrid] = useState<ClassicalGridState>(() => createGrid(0));
  const [targetGrid, setTargetGrid] = useState<ClassicalGridState>(() => createGrid(0));

  const toggleSystemCell = useCallback((x: number, y: number) => {
    setSystemGrid(prev =>
      prev.map((row, rowIndex) =>
        row.map((value, colIndex) => (rowIndex === y && colIndex === x ? 1 - value : value))
      )
    );
  }, []);

  const setPattern = useCallback((pattern: Pattern) => {
    if (pattern === Pattern.RANDOM) {
      setSystemGrid(() =>
        createGrid(0).map(row => row.map(() => (Math.random() > 0.7 ? 1 : 0)))
      );
    } else if (pattern === Pattern.CLEAR) {
      setSystemGrid(() => createGrid(0));
    } else {
      setSystemGrid(() => placePattern(PATTERNS[pattern]));
    }
    setTargetGrid(() => createGrid(0));
  }, []);

  const clearAll = useCallback(() => {
    setSystemGrid(() => createGrid(0));
    setTargetGrid(() => createGrid(0));
  }, []);

  const computePreview = useMemo(() => performGOLStep(systemGrid), [systemGrid]);

  const systemPopulation = useMemo(
    () => systemGrid.reduce((acc, row) => acc + row.reduce((sum, cell) => sum + cell, 0), 0),
    [systemGrid]
  );

  const targetPopulation = useMemo(
    () => targetGrid.reduce((acc, row) => acc + row.reduce((sum, cell) => sum + cell, 0), 0),
    [targetGrid]
  );

  const changedCells = useMemo(() => {
    let delta = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (computePreview[y][x] !== systemGrid[y][x]) {
          delta++;
        }
      }
    }
    return delta;
  }, [computePreview, systemGrid]);

  const isTargetClean = useMemo(() => targetPopulation === 0, [targetPopulation]);

  const computeIntoTarget = useCallback(() => {
    const update = computePreview;
    setTargetGrid(prev =>
      prev.map((row, y) => row.map((value, x) => (value ^ update[y][x]) as 0 | 1))
    );
  }, [computePreview]);

  const swapRegisters = useCallback(() => {
    setSystemGrid(prevSystem => {
      const newSystem = cloneGrid(targetGrid);
      setTargetGrid(cloneGrid(prevSystem));
      return newSystem;
    });
  }, [targetGrid]);

  const advanceCycle = useCallback(() => {
    if (!isTargetClean) {
      return false;
    }
    const update = computePreview;
    const newTarget = targetGrid.map((row, y) => row.map((value, x) => (value ^ update[y][x]) as 0 | 1));
    const newSystem = cloneGrid(newTarget);
    const oldSystem = cloneGrid(systemGrid);
    setSystemGrid(newSystem);
    setTargetGrid(oldSystem);
    return true;
  }, [computePreview, isTargetClean, systemGrid, targetGrid]);

  const resetTarget = useCallback(() => {
    setTargetGrid(() => createGrid(0));
  }, []);

  return {
    gridSize: GRID_SIZE,
    systemGrid,
    targetGrid,
    computePreview,
    toggleSystemCell,
    setPattern,
    clearAll,
    computeIntoTarget,
    swapRegisters,
    advanceCycle,
    resetTarget,
    systemPopulation,
    targetPopulation,
    changedCells,
    isTargetClean,
  };
};

export type UseReversibleLifeReturn = ReturnType<typeof useReversibleLife>;
