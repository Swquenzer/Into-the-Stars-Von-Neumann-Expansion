import React from "react";
import { GameState, ProbeState } from "../types";
import { generateSystemLore } from "../services/geminiService";

export type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

/**
 * Analyze a system to reveal resources and generate lore
 */
export const handleAnalyze = async (
  setGameState: SetGameState,
  gameState: GameState,
  systemId: string
) => {
  const system = gameState.systems.find((s) => s.id === systemId);
  if (!system || system.analyzed) return;

  // Check for docked probe
  const probePresent = gameState.probes.some(
    (p) =>
      p.locationId === systemId &&
      p.state !== ProbeState.Traveling &&
      p.state !== ProbeState.Exploring
  );

  if (!probePresent) {
    setGameState((prev) => ({
      ...prev,
      logs: [
        ...prev.logs,
        `Analysis failed: No docked probe available at ${system.name}.`,
      ],
    }));
    return;
  }

  // Optimistic update
  setGameState((prev) => ({
    ...prev,
    systems: prev.systems.map((s) =>
      s.id === systemId ? { ...s, analyzed: true } : s
    ),
    logs: [...prev.logs, `Analyzing signal from ${system.name}...`],
  }));

  const lore = await generateSystemLore(system);

  setGameState((prev) => ({
    ...prev,
    systems: prev.systems.map((s) => (s.id === systemId ? { ...s, lore } : s)),
    logs: [...prev.logs, `Analysis complete for ${system.name}.`],
  }));
};
