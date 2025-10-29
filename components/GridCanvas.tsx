
import React, { useRef, useEffect } from 'react';
import { GRID_WIDTH, GRID_HEIGHT } from '../constants';
import type { GridState } from '../types';

interface GridCanvasProps {
  grid: GridState;
}

const CELL_SIZE = 5;
const GRID_COLOR = '#1f2937'; // gray-800
const ALIVE_COLOR_START = '#67e8f9'; // cyan-300
const ALIVE_COLOR_END = '#0e7490'; // cyan-700

// Simple linear interpolation for colors
const lerpColor = (c1: string, c2: string, amount: number): string => {
    const [r1, g1, b1] = c1.slice(1).match(/.{2}/g)!.map(hex => parseInt(hex, 16));
    const [r2, g2, b2] = c2.slice(1).match(/.{2}/g)!.map(hex => parseInt(hex, 16));
    const r = Math.round(r1 + (r2 - r1) * amount).toString(16).padStart(2, '0');
    const g = Math.round(g1 + (g2 - g1) * amount).toString(16).padStart(2, '0');
    const b = Math.round(b1 + (b2 - b1) * amount).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
};


const GridCanvas: React.FC<GridCanvasProps> = ({ grid }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const qubit = grid[y][x];
        const prob1 = qubit[1].re * qubit[1].re + qubit[1].im * qubit[1].im;
        
        if (prob1 > 0.01) {
          ctx.fillStyle = lerpColor(ALIVE_COLOR_END, ALIVE_COLOR_START, prob1);
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }, [grid]);
  
  const canvasWidth = GRID_WIDTH * CELL_SIZE;
  const canvasHeight = GRID_HEIGHT * CELL_SIZE;

  return (
    <div className="bg-gray-800 p-2 rounded-lg shadow-lg">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="bg-gray-900 rounded"
      />
    </div>
  );
};

export default GridCanvas;
