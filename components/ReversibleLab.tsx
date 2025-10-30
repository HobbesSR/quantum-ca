import React, { useMemo, useState } from 'react';
import { Pattern } from '../types';
import ReversibleGrid from './ReversibleGrid';
import { useReversibleLife } from '../hooks/useReversibleLife';

const patternOptions = [
  { value: Pattern.CLEAR, label: 'Clear' },
  { value: Pattern.RANDOM, label: 'Random noise' },
  { value: Pattern.GLIDER, label: 'Glider' },
  { value: Pattern.LWSS, label: 'Lightweight spaceship' },
  { value: Pattern.BLINKER, label: 'Blinker' },
];

const ReversibleLab: React.FC = () => {
  const {
    gridSize,
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
  } = useReversibleLife();

  const [statusMessage, setStatusMessage] = useState<string>('');

  const nextStateIsLoaded = useMemo(() => {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (targetGrid[y][x] !== 0) {
          return true;
        }
      }
    }
    return false;
  }, [gridSize, targetGrid]);

  const handleAdvance = () => {
    const ok = advanceCycle();
    if (!ok) {
      setStatusMessage('Target register must be |0⟩ before applying a fresh reversible update.');
      return;
    }
    setStatusMessage('New state swapped into the system register while preserving the previous one.');
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-gray-200 leading-relaxed shadow-lg">
        <h2 className="text-2xl font-bold text-cyan-300 mb-2">Reversible embedding laboratory</h2>
        <p>
          This sandbox demonstrates how a classical Game of Life update can be implemented as a reversible,
          permutation-like map. The system register holds the current universe, while a clean target register
          accumulates the next generation through an XOR update. Swapping the registers promotes the freshly
          computed layer without deleting the previous configuration.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Try loading patterns, computing their reversible update, and swapping the registers. Because every
          step preserves information, you&apos;ll need an additional clean register before you can advance again—highlighting
          why a unitary substrate requires bookkeeping instead of a direct overwrite.
        </p>
      </section>

      <section className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <ReversibleGrid
            label="System register"
            description="Current classical configuration used as control for the reversible update."
            grid={systemGrid}
            size={gridSize}
            onToggle={toggleSystemCell}
            highlight={computePreview}
          />
          <ReversibleGrid
            label="Target register"
            description="Ancilla qubits that store the XOR of the next state. Keep this clean (|0⟩) before starting a new reversible sweep."
            grid={targetGrid}
            size={gridSize}
          />
        </div>

        <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-5 flex flex-col gap-4 text-gray-200 shadow-lg">
          <div>
            <h3 className="text-lg font-semibold text-cyan-200">Register statistics</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li><span className="text-gray-400">System population:</span> {systemPopulation}</li>
              <li><span className="text-gray-400">Target population:</span> {targetPopulation}</li>
              <li><span className="text-gray-400">Cells that will flip:</span> {changedCells}</li>
              <li>
                <span className="text-gray-400">Target status:</span> {isTargetClean ? 'clean |0⟩' : 'contains history'}
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-cyan-200" htmlFor="pattern-select">
              Seed pattern
            </label>
            <select
              id="pattern-select"
              className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              onChange={event => setPattern(event.target.value as Pattern)}
            >
              {patternOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="mt-1 inline-flex justify-center rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500"
              onClick={() => setPattern(Pattern.RANDOM)}
            >
              Randomise system register
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-cyan-200">Reversible pipeline</h3>
            <button
              type="button"
              className="rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-600"
              onClick={() => {
                computeIntoTarget();
                setStatusMessage('Applied the reversible XOR update into the target register.');
              }}
            >
              Compute next layer (target ⊕= f(system))
            </button>
            <button
              type="button"
              className="rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                swapRegisters();
                setStatusMessage('Registers swapped. Previous state now lives in the target register.');
              }}
              disabled={!nextStateIsLoaded}
            >
              Swap system ↔ target
            </button>
            <button
              type="button"
              className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAdvance}
              disabled={!isTargetClean}
            >
              Advance one reversible generation
            </button>
            <p className="text-xs text-gray-400">
              The advance button performs the compute ⟶ swap sequence in one atomic step, but only if the target register is clean.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-cyan-200">Maintenance</h3>
            <button
              type="button"
              className="rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold hover:bg-gray-600"
              onClick={() => {
                clearAll();
                setStatusMessage('Cleared both registers to |0⟩.');
              }}
            >
              Reset experiment
            </button>
            <button
              type="button"
              className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
              onClick={() => {
                resetTarget();
                setStatusMessage('Forced the target register back to |0⟩ (non-unitary cleanup).');
              }}
            >
              Force target → |0⟩ (breaks reversibility)
            </button>
            <p className="text-xs text-amber-400">
              Forcing the target register to |0⟩ mimics an explicit measurement/environment dump. It is provided for experimentation
              but violates the reversible contract.
            </p>
          </div>

          {statusMessage && (
            <div className="text-xs text-cyan-300 bg-gray-900/80 border border-cyan-900 rounded-md px-3 py-2">
              {statusMessage}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ReversibleLab;
