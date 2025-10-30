import React from 'react';
import type { ClassicalGridState } from '../types';

interface ReversibleGridProps {
  label: string;
  grid: ClassicalGridState;
  size: number;
  onToggle?: (x: number, y: number) => void;
  description?: string;
  highlight?: ClassicalGridState | null;
}

const baseCellClasses =
  'w-5 h-5 sm:w-6 sm:h-6 border border-gray-700 transition-colors duration-150';

const ReversibleGrid: React.FC<ReversibleGridProps> = ({
  label,
  grid,
  size,
  onToggle,
  description,
  highlight,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-lg font-semibold text-cyan-200">{label}</h3>
        {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      </div>
      <div
        className="grid gap-0.5 bg-gray-800 p-2 rounded-lg shadow-inner"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const next = highlight ? highlight[y][x] : null;
            let classes = `${baseCellClasses} ${cell === 1 ? 'bg-cyan-500' : 'bg-gray-900'}`;
            if (next !== null && next !== cell) {
              classes += next === 1 ? ' ring-2 ring-amber-400' : ' ring-2 ring-slate-500';
            }
            return (
              <button
                key={`${x}-${y}`}
                type="button"
                onClick={() => onToggle?.(x, y)}
                className={classes}
                title={next !== null && next !== cell ? 'Will flip after compute' : undefined}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReversibleGrid;
