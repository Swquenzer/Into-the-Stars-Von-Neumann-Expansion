import React from "react";
import {
  GameState,
  Probe,
  ProbeStats,
  ProbeState,
  ResourceType,
} from "../types";
import { UPGRADE_COSTS, MAX_STAT_LEVELS } from "../constants";

export type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

/**
 * Rename a probe
 */
export const handleRenameProbe = (
  setGameState: SetGameState,
  probeId: string,
  newName: string
) => {
  setGameState((prev) => ({
    ...prev,
    probes: prev.probes.map((p) =>
      p.id === probeId ? { ...p, name: newName } : p
    ),
    logs: [
      ...prev.logs,
      `Unit ${
        prev.probes.find((p) => p.id === probeId)?.name
      } renamed to ${newName}.`,
    ],
  }));
};

/**
 * Toggle probe autonomy
 */
export const handleToggleAutonomy = (
  setGameState: SetGameState,
  probeId: string
) => {
  setGameState((prev) => {
    const probe = prev.probes.find((p) => p.id === probeId);
    if (!probe) return prev;

    const willDisableAI = probe.isAutonomyEnabled;

    // Toggle AI state
    const updatedProbes = prev.probes.map((p) =>
      p.id === probeId ? { ...p, isAutonomyEnabled: !p.isAutonomyEnabled } : p
    );

    // If turning AI off, halt current operation
    const finalProbes = willDisableAI
      ? updatedProbes.map((p) =>
          p.id === probeId &&
          (p.state === ProbeState.MiningMetal ||
            p.state === ProbeState.MiningPlutonium ||
            p.state === ProbeState.Scanning ||
            p.state === ProbeState.Researching)
            ? {
                ...p,
                state: ProbeState.Idle,
                progress: 0,
                miningBuffer: 0,
              }
            : p
        )
      : updatedProbes;

    const logMessage = willDisableAI
      ? `${probe.name} autonomous systems disabled, operations halted.`
      : `${probe.name} autonomous systems enabled.`;

    return {
      ...prev,
      probes: finalProbes,
      logs: [...prev.logs, logMessage],
    };
  });
};

/**
 * Upgrade a probe stat
 */
export const handleUpgradeProbe = (
  setGameState: SetGameState,
  gameState: GameState,
  probeId: string,
  statKey: keyof ProbeStats
) => {
  setGameState((prev) => {
    const probe = prev.probes.find((p) => p.id === probeId);
    if (!probe || probe.state !== ProbeState.Idle) return prev;

    const upgradeConfig = UPGRADE_COSTS[statKey];
    if (!upgradeConfig) return prev;

    const currentVal = probe.stats[statKey];
    // Use dynamic max level from unlocks, fallback to base max
    const maxLevel =
      prev.maxStatLevelOverrides[statKey] ?? MAX_STAT_LEVELS[statKey];

    // Check if already at max level
    if (currentVal >= maxLevel) {
      return {
        ...prev,
        logs: [
          ...prev.logs,
          `${probe.name}: ${upgradeConfig.name} already at maximum level.`,
        ],
      };
    }
    let levelFactor = currentVal;
    if (statKey === "scanRange") {
      levelFactor = currentVal / upgradeConfig.increment;
    }

    const metalCost = Math.floor(upgradeConfig.Metal * (levelFactor + 1));
    const plutoniumCost = Math.floor(
      upgradeConfig.Plutonium * (levelFactor + 1)
    );

    if (
      probe.inventory.Metal < metalCost ||
      probe.inventory.Plutonium < plutoniumCost
    ) {
      return {
        ...prev,
        logs: [...prev.logs, `Upgrade failed: Insufficient resources.`],
      };
    }

    return {
      ...prev,
      probes: prev.probes.map((p) =>
        p.id === probeId
          ? {
              ...p,
              inventory: {
                Metal: p.inventory.Metal - metalCost,
                Plutonium: p.inventory.Plutonium - plutoniumCost,
              },
              stats: {
                ...p.stats,
                [statKey]: currentVal + upgradeConfig.increment,
              },
              isAutonomyEnabled:
                statKey === "autonomyLevel" ? true : p.isAutonomyEnabled,
            }
          : p
      ),
      logs: [
        ...prev.logs,
        `${probe.name} upgraded ${upgradeConfig.name} (Level ${
          levelFactor + 1
        }).`,
      ],
    };
  });
};

/**
 * Self-destruct a probe
 */
export const handleSelfDestruct = (
  setGameState: SetGameState,
  gameState: GameState,
  probeId: string
) => {
  setGameState((prev) => ({
    ...prev,
    probes: prev.probes.filter((p) => p.id !== probeId),
    selectedProbeId:
      prev.selectedProbeId === probeId ? null : prev.selectedProbeId,
    logs: [
      ...prev.logs,
      `Unit ${
        prev.probes.find((p) => p.id === probeId)?.name
      } self-destruct sequence initiated. Signal lost.`,
    ],
  }));
};

/**
 * Admin: Spawn Super Probe at selected system
 */
export const handleAdminSpawnSuperProbe = (
  setGameState: SetGameState,
  gameState: GameState
) => {
  const systemId = gameState.selectedSystemId;
  if (!systemId) return;
  const system = gameState.systems.find((s) => s.id === systemId);
  if (!system) return;

  const newProbe: Probe = {
    id: `admin-probe-${Date.now()}`,
    name: "ADMIN SUPER PROBE",
    model: "Admin Super Probe",
    state: ProbeState.Idle,
    locationId: system.id,
    originSystemId: system.id,
    position: { ...system.position },
    targetSystemId: null,
    inventory: {
      [ResourceType.Metal]: 5000,
      [ResourceType.Plutonium]: 2000,
    },
    stats: {
      miningSpeed: 10,
      flightSpeed: 10,
      replicationSpeed: 5,
      scanRange: 1000,
      scanSpeed: 10,
      autonomyLevel: 2,
    },
    progress: 0,
    miningBuffer: 0,
    isSolarSailing: false,
    isAutonomyEnabled: false,
    aiModules: [],
    aiDecisionLog: [],
  };

  setGameState((prev) => ({
    ...prev,
    probes: [...prev.probes, newProbe],
    logs: [...prev.logs, `ADMIN: Deployed Super Probe at ${system.name}.`],
  }));
};
