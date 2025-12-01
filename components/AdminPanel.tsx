import React, { useState } from "react";
import { GameState } from "../types";

interface AdminPanelProps {
  gameState: GameState;
  onSetScience: (value: number) => void;
  onSpawnSuperProbe: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  gameState,
  onSetScience,
  onSpawnSuperProbe,
}) => {
  const [scienceInput, setScienceInput] = useState(gameState.science);
  const [minimized, setMinimized] = useState(false); // Default: visible

  if (minimized) {
    return (
      <button
        className="fixed bottom-4 left-4 z-50 bg-amber-700 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded shadow-lg border border-amber-400"
        onClick={() => setMinimized(false)}
      >
        Admin
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-slate-900 border border-amber-400 rounded-lg shadow-lg p-4 w-80">
      <div className="flex items-center justify-between mb-2">
        <span className="text-amber-400 font-bold text-sm">ADMIN PANEL</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Cheats & Debug</span>
          <button
            className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-0.5 rounded border border-amber-400 font-bold"
            onClick={() => setMinimized(true)}
            title="Minimize"
          >
            –
          </button>
        </div>
      </div>
      <div className="mb-4">
        <label className="text-xs text-slate-300 font-bold mb-1 block">
          Global Science
        </label>
        <input
          type="number"
          className="w-full px-2 py-1 rounded border border-slate-700 bg-slate-800 text-amber-300 font-mono text-sm"
          value={scienceInput}
          onChange={(e) => setScienceInput(Number(e.target.value))}
        />
        <button
          className="mt-2 w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-1 rounded"
          onClick={() => onSetScience(scienceInput)}
        >
          Set Science
        </button>
      </div>
      <div className="mb-2">
        <label className="text-xs text-slate-300 font-bold mb-1 block">
          Admin Actions
        </label>
        <button
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-1 rounded disabled:opacity-50"
          onClick={onSpawnSuperProbe}
          disabled={!gameState.selectedSystemId}
          title={
            gameState.selectedSystemId
              ? "Spawn Admin Super Probe at selected system"
              : "Select a system to spawn the probe"
          }
        >
          Spawn Admin Super Probe
        </button>
      </div>
      {/* Future cheats can be added here */}
    </div>
  );
};
