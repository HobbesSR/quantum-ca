import React, { useState } from 'react';
import GridCanvas from './components/GridCanvas';
import Controls from './components/Controls';
import ReversibleLab from './components/ReversibleLab';
import { useQuantumLife } from './hooks/useQuantumLife';
import { useRuleSearch } from './hooks/useRuleSearch';
import type { MatrixType, CoeffPart, PauliCoefficients } from './types';

const App: React.FC = () => {
  const [activeLab, setActiveLab] = useState<'quantum' | 'reversible'>('quantum');

  const {
    grid,
    generation,
    isRunning,
    setIsRunning,
    simulationStep,
    resetGrid,
    params,
    setParams,
  } = useQuantumLife();

  const {
    isSearching,
    toggleSearch,
    resetSearch,
    searchProgress,
    bestParams,
  } = useRuleSearch();

  const handleParamChange = (
    matrix: MatrixType,
    coeff: keyof PauliCoefficients,
    part: CoeffPart,
    value: string,
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setParams(p => ({
      ...p,
      [matrix]: {
        ...p[matrix],
        [coeff]: {
          ...p[matrix][coeff],
          [part]: numValue,
        },
      },
    }));
  };

  const handleGammaChange = (value: number) => {
    setParams(p => ({ ...p, gamma: value }));
  };

  const handleApplyBestParams = () => {
    if (bestParams) {
      setParams(p => ({ ...bestParams, gamma: p.gamma }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8 bg-gray-900 font-sans">
      <header className="w-full max-w-7xl text-center mb-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">
          Quantum Game of Life
        </h1>
        <p className="mt-2 text-md sm:text-lg text-gray-400 max-w-3xl mx-auto">
          Explore two experimental laboratories: tune a decohered quantum update that mimics Life, or step through a fully
          reversible embedding that keeps track of every bit of history.
        </p>
      </header>

      <main className="w-full max-w-7xl flex flex-col gap-6 md:gap-8">
        <nav className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-gray-800/70 border border-gray-700 rounded-xl px-4 py-3">
          <button
            type="button"
            onClick={() => setActiveLab('quantum')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 ${
              activeLab === 'quantum'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Decohered quantum search lab
          </button>
          <button
            type="button"
            onClick={() => setActiveLab('reversible')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 ${
              activeLab === 'reversible'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Reversible embedding lab
          </button>
        </nav>

        {activeLab === 'quantum' ? (
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
            <aside className="lg:w-1/3 xl:w-1/4">
              <Controls
                isRunning={isRunning}
                onToggleRunning={() => setIsRunning(!isRunning)}
                onStep={simulationStep}
                onReset={pattern => resetGrid(pattern)}
                generation={generation}
                params={params}
                onParamChange={handleParamChange}
                onGammaChange={handleGammaChange}
                isSearching={isSearching}
                onToggleSearch={toggleSearch}
                onResetSearch={resetSearch}
                searchProgress={searchProgress}
                bestParams={bestParams}
                onApplyBestParams={handleApplyBestParams}
              />
            </aside>

            <div className="flex-1 flex items-center justify-center">
              <GridCanvas grid={grid} />
            </div>
          </div>
        ) : (
          <ReversibleLab />
        )}
      </main>
    </div>
  );
};

export default App;
