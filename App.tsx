import React from 'react';
import GridCanvas from './components/GridCanvas';
import Controls from './components/Controls';
import { useQuantumLife } from './hooks/useQuantumLife';
import { useRuleSearch } from './hooks/useRuleSearch';
import type { SimulationParameters, MatrixType, CoeffPart, PauliCoefficients } from './types';

const App: React.FC = () => {
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
    value: string
  ) => {
    const numValue = parseFloat(value);
    // Do not update state if the input is not a valid number,
    // this prevents crashes on temporarily empty or invalid inputs.
    if (isNaN(numValue)) return;

    setParams(p => ({
        ...p,
        [matrix]: {
            ...p[matrix],
            [coeff]: {
                ...p[matrix][coeff],
                [part]: numValue
            }
        }
    }));
  };
  
  const handleGammaChange = (value: number) => {
      setParams(p => ({ ...p, gamma: value }));
  };

  const handleApplyBestParams = () => {
    if (bestParams) {
      // Keep the current gamma value when applying new angles
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
          A simulation of Conway's Game of Life emerging from a local unitary evolution followed by decoherence. Use the automated search to discover parameters that produce Life-like rules.
        </p>
      </header>
      
      <main className="flex flex-col lg:flex-row gap-6 md:gap-8 w-full max-w-7xl">
        <aside className="lg:w-1/3 xl:w-1/4">
          <Controls
            isRunning={isRunning}
            onToggleRunning={() => setIsRunning(!isRunning)}
            onStep={simulationStep}
            onReset={(pattern) => resetGrid(pattern)}
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
      </main>
    </div>
  );
};

export default App;