import React from 'react';
import { type SimulationParameters, Pattern, type SearchProgress, type MatrixType, type CoeffPart, PauliCoefficients } from '../types';

interface ControlsProps {
  isRunning: boolean;
  onToggleRunning: () => void;
  onStep: () => void;
  onReset: (pattern: Pattern) => void;
  generation: number;
  params: SimulationParameters;
  onParamChange: (matrix: MatrixType, coeff: keyof PauliCoefficients, part: CoeffPart, value: string) => void;
  onGammaChange: (value: number) => void;
  isSearching: boolean;
  onToggleSearch: () => void;
  onResetSearch: () => void;
  searchProgress: SearchProgress;
  bestParams: SimulationParameters | null;
  onApplyBestParams: () => void;
}

const ParameterSlider: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, value, min, max, step, onChange }) => (
    <div className="flex flex-col space-y-1">
        <label className="flex justify-between text-sm font-medium text-gray-300">
            <span>{label}</span>
            <span>{value.toFixed(2)}</span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
    </div>
);

const SearchInfo: React.FC<{ label: string; value: string | number;}> = ({label, value}) => (
    <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}:</span>
        <span className="font-mono text-cyan-300">{value}</span>
    </div>
);

const MatrixEditor: React.FC<{
  title: string;
  matrixType: MatrixType;
  coeffs: PauliCoefficients;
  onParamChange: (matrix: MatrixType, coeff: keyof PauliCoefficients, part: CoeffPart, value: string) => void;
}> = ({ title, matrixType, coeffs, onParamChange }) => (
  <div>
    <h5 className="text-xs font-semibold text-gray-300 mb-1">{title}</h5>
    <table className="w-full text-xs text-left">
      <thead className="text-gray-400">
        <tr className="border-b border-gray-700">
          <th className="px-1 py-1">Coeff</th>
          <th className="px-1 py-1 text-center">Real</th>
          <th className="px-1 py-1 text-center">Imaginary</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(coeffs).map(([key, value]) => (
          <tr key={`${matrixType}-${key}`} className="border-b border-gray-800 last:border-b-0">
            <td className="px-1 py-1 font-sans text-gray-300">{key.substring(1)}</td>
            <td className="px-1 py-1 text-center">
              <input
                type="number"
                step="0.01"
                value={value.re}
                onChange={(e) => onParamChange(matrixType, key as keyof PauliCoefficients, 're', e.target.value)}
                className="w-full bg-gray-700 text-cyan-300 text-center rounded-sm border-gray-600 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-mono"
              />
            </td>
            <td className="px-1 py-1 text-center">
               <input
                type="number"
                step="0.01"
                value={value.im}
                onChange={(e) => onParamChange(matrixType, key as keyof PauliCoefficients, 'im', e.target.value)}
                className="w-full bg-gray-700 text-cyan-300 text-center rounded-sm border-gray-600 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-mono"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);


const Controls: React.FC<ControlsProps> = ({
  isRunning,
  onToggleRunning,
  onStep,
  onReset,
  generation,
  params,
  onParamChange,
  onGammaChange,
  isSearching,
  onToggleSearch,
  onResetSearch,
  searchProgress,
  bestParams,
  onApplyBestParams,
}) => {
  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg flex flex-col space-y-6 w-full max-w-sm">
        <div>
            <h2 className="text-xl font-bold text-cyan-300">Controls</h2>
            <p className="text-gray-400 text-sm mt-1">Generation: {generation}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
            <button onClick={onToggleRunning} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-md text-white font-semibold transition-colors col-span-2 disabled:opacity-50" disabled={isSearching}>
                {isRunning ? 'Pause' : 'Play'}
            </button>
            <button onClick={onStep} disabled={isRunning || isSearching} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Step
            </button>
        </div>

        <div className="flex flex-col space-y-2">
           <label className="text-sm font-medium text-gray-300">Initial Pattern</label>
           <select 
             onChange={(e) => onReset(e.target.value as Pattern)} 
             className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"
             disabled={isSearching}
           >
            {Object.values(Pattern).map(p => <option key={p} value={p}>{p}</option>)}
           </select>
        </div>

        {/* Automated Search Section */}
        <div className="flex flex-col space-y-4 pt-4 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-cyan-300">Automated Rule Search</h3>
            <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={onToggleSearch} 
                  className={`px-4 py-2 rounded-md text-white font-semibold transition-colors col-span-2 ${isSearching ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'}`}
                >
                    {isSearching ? 'Pause Search' : (searchProgress.generation > 0 ? 'Resume Search' : 'Start Search')}
                </button>
                <button 
                  onClick={onResetSearch} 
                  disabled={isSearching} 
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md text-white font-semibold transition-colors disabled:opacity-50"
                >
                    Reset
                </button>
                 <button 
                   onClick={onApplyBestParams} 
                   disabled={!bestParams || isSearching} 
                   className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    Apply Best
                </button>
            </div>
            <div className="p-3 bg-gray-900 rounded-md space-y-2">
                <SearchInfo label="Status" value={isSearching ? 'Searching...' : (searchProgress.generation > 0 ? 'Paused' : 'Idle')} />
                <SearchInfo label="GA Generation" value={searchProgress.generation} />
                <SearchInfo label="Best Fitness" value={searchProgress.bestFitness.toFixed(4)} />
                {bestParams && (
                    <div className="pt-2 mt-2 border-t border-gray-700">
                      <h4 className="text-sm font-medium text-gray-400 text-center mb-2">Best Discovered Interaction</h4>
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-xs font-semibold text-gray-300 mb-1">W_self (Self-Interaction)</h5>
                          <table className="w-full text-xs text-left">
                            <thead className="text-gray-400">
                              <tr className="border-b border-gray-700">
                                <th className="px-1 py-1">Coeff</th>
                                <th className="px-1 py-1 text-center">Real</th>
                                <th className="px-1 py-1 text-center">Imaginary</th>
                              </tr>
                            </thead>
                            <tbody className="font-mono text-cyan-300">
                              {Object.entries(bestParams.w_self).map(([key, value]) => (
                                <tr key={`self-${key}`} className="border-b border-gray-800 last:border-b-0">
                                  <td className="px-1 py-1 font-sans text-gray-300">{key.substring(1)}</td>
                                  <td className="px-1 py-1 text-center">{value.re.toFixed(3)}</td>
                                  <td className="px-1 py-1 text-center">{value.im.toFixed(3)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold text-gray-300 mb-1">W_neighbor (Neighbor Interaction)</h5>
                           <table className="w-full text-xs text-left">
                            <thead className="text-gray-400">
                              <tr className="border-b border-gray-700">
                                <th className="px-1 py-1">Coeff</th>
                                <th className="px-1 py-1 text-center">Real</th>
                                <th className="px-1 py-1 text-center">Imaginary</th>
                              </tr>
                            </thead>
                            <tbody className="font-mono text-cyan-300">
                              {Object.entries(bestParams.w_neighbor).map(([key, value]) => (
                                <tr key={`neighbor-${key}`} className="border-b border-gray-800 last:border-b-0">
                                  <td className="px-1 py-1 font-sans text-gray-300">{key.substring(1)}</td>
                                  <td className="px-1 py-1 text-center">{value.re.toFixed(3)}</td>
                                  <td className="px-1 py-1 text-center">{value.im.toFixed(3)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                )}
            </div>
        </div>

        <div className="flex flex-col space-y-4 pt-4 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-cyan-300">Manual Interaction Editor</h3>
             <div className="p-3 bg-gray-900 rounded-md space-y-3">
                <MatrixEditor
                    title="W_self (Self-Interaction)"
                    matrixType="w_self"
                    coeffs={params.w_self}
                    onParamChange={onParamChange}
                />
                <MatrixEditor
                    title="W_neighbor (Neighbor Interaction)"
                    matrixType="w_neighbor"
                    coeffs={params.w_neighbor}
                    onParamChange={onParamChange}
                />
            </div>
        </div>


        <div className="flex flex-col space-y-4 pt-4 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-cyan-300">Global Parameters</h3>
            <ParameterSlider
                label="γ (Decoherence)"
                value={params.gamma}
                min={0} max={1} step={0.01}
                onChange={(e) => onGammaChange(parseFloat(e.target.value))}
            />
        </div>
    </div>
  );
};

export default Controls;