import React from "react";
import { GameState, AIBehavior, AIModule } from "../types";
import { AI_MODULE_COSTS, SCIENCE_UNLOCK_IDS } from "../constants";

type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

/**
 * Set the AI behavior mode for a probe
 */
export const handleSetAIBehavior = (
  setGameState: SetGameState,
  gameState: GameState,
  probeId: string,
  behavior: AIBehavior
) => {
  const probe = gameState.probes.find((p) => p.id === probeId);
  if (!probe) return;

  // Check if probe has autonomy level 2
  if (probe.stats.autonomyLevel < 2) {
    return; // Silently fail - UI should prevent this
  }

  // Check if behavior is unlocked
  if (behavior !== AIBehavior.None) {
    const hasModule = probe.aiModules?.some((m) => m.type === behavior);
    if (!hasModule) {
      return; // Must have module installed
    }
  }

  setGameState((prev) => ({
    ...prev,
    probes: prev.probes.map((p) =>
      p.id === probeId
        ? {
            ...p,
            aiBehavior: behavior,
            aiDecisionLog: [], // Reset decision log when changing behavior
          }
        : p
    ),
    logs: [
      ...prev.logs,
      `${probe.name} AI behavior set to: ${
        behavior === AIBehavior.None ? "Default (Mining)" : behavior
      }`,
    ],
  }));
};

/**
 * Install an AI behavior module on a probe
 */
export const handleInstallAIModule = (
  setGameState: SetGameState,
  gameState: GameState,
  probeId: string,
  behavior: AIBehavior
) => {
  const probe = gameState.probes.find((p) => p.id === probeId);
  if (!probe) return;

  // Check autonomy level
  if (probe.stats.autonomyLevel < 2) {
    return;
  }

  // Check if already installed
  if (probe.aiModules?.some((m) => m.type === behavior)) {
    return; // Already have this module
  }

  // Check unlock (unlockedAIBehaviors contains behavior enums, not unlock IDs)
  if (!gameState.unlockedAIBehaviors?.includes(behavior)) {
    return; // Must unlock via science first
  }

  // Check resources
  const cost = AI_MODULE_COSTS[behavior];
  if (!cost) return;

  if (
    probe.inventory.Metal < cost.Metal ||
    probe.inventory.Plutonium < cost.Plutonium
  ) {
    return; // Insufficient resources
  }

  const newModule: AIModule = {
    id: `${probeId}-${behavior}-${Date.now()}`,
    type: behavior,
    installedAt: Date.now(),
  };

  setGameState((prev) => ({
    ...prev,
    probes: prev.probes.map((p) =>
      p.id === probeId
        ? {
            ...p,
            inventory: {
              Metal: p.inventory.Metal - cost.Metal,
              Plutonium: p.inventory.Plutonium - cost.Plutonium,
            },
            aiModules: [...(p.aiModules || []), newModule],
          }
        : p
    ),
    logs: [
      ...prev.logs,
      `${probe.name} installed ${behavior} module (${cost.Metal}M, ${cost.Plutonium}P)`,
    ],
  }));
};

/**
 * Uninstall an AI behavior module from a probe
 */
export const handleUninstallAIModule = (
  setGameState: SetGameState,
  gameState: GameState,
  probeId: string,
  behavior: AIBehavior
) => {
  const probe = gameState.probes.find((p) => p.id === probeId);
  if (!probe) return;

  const module = probe.aiModules?.find((m) => m.type === behavior);
  if (!module) return;

  setGameState((prev) => ({
    ...prev,
    probes: prev.probes.map((p) =>
      p.id === probeId
        ? {
            ...p,
            aiModules: (p.aiModules || []).filter((m) => m.id !== module.id),
            aiBehavior:
              p.aiBehavior === behavior ? AIBehavior.None : p.aiBehavior, // Reset if active
          }
        : p
    ),
    logs: [...prev.logs, `${probe.name} uninstalled ${behavior} module`],
  }));
};

/**
 * Helper to get unlock ID for a behavior module
 */
const getModuleUnlockId = (behavior: AIBehavior): string => {
  switch (behavior) {
    case AIBehavior.FocusMining:
      return SCIENCE_UNLOCK_IDS.FOCUS_MINING_MODULE;
    case AIBehavior.FocusExploring:
      return SCIENCE_UNLOCK_IDS.FOCUS_EXPLORING_MODULE;
    case AIBehavior.FocusScience:
      return SCIENCE_UNLOCK_IDS.FOCUS_SCIENCE_MODULE;
    default:
      return "";
  }
};
