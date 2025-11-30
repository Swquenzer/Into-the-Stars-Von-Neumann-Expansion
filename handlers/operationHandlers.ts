import React from "react";
import { GameState, ResourceType, ProbeState, ProbeBlueprint } from "../types";

export type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

/**
 * Start mining a resource
 */
export const handleMine = (
  setGameState: SetGameState,
  gameState: GameState,
  resource: ResourceType
) => {
  setGameState((prev) => {
    const probe = prev.probes.find((p) => p.id === prev.selectedProbeId);
    if (!probe || probe.locationId === null) return prev;

    const system = prev.systems.find((s) => s.id === probe.locationId);
    if (!system || system.resourceYield[resource] <= 0) return prev;

    const newState =
      resource === ResourceType.Metal
        ? ProbeState.MiningMetal
        : ProbeState.MiningPlutonium;

    return {
      ...prev,
      probes: prev.probes.map((p) =>
        p.id === probe.id
          ? {
              ...p,
              state: newState,
              progress: 0,
              miningBuffer: 0,
            }
          : p
      ),
      logs: [...prev.logs, `${probe.name} beginning ${resource} extraction.`],
    };
  });
};

/**
 * Stop current operation (mining or replication)
 */
export const handleStopOperation = (
  setGameState: SetGameState,
  gameState: GameState
) => {
  setGameState((prev) => {
    const probe = prev.probes.find((p) => p.id === prev.selectedProbeId);
    if (!probe) return prev;

    if (
      probe.state !== ProbeState.MiningMetal &&
      probe.state !== ProbeState.MiningPlutonium &&
      probe.state !== ProbeState.Replicating
    ) {
      return prev;
    }

    let updatedProbe = {
      ...probe,
      state: ProbeState.Idle,
      progress: 0,
      miningBuffer: 0,
    };
    let logMsg = `${probe.name} halted operations.`;

    // Refund resources if stopping replication
    if (probe.state === ProbeState.Replicating && probe.pendingBlueprint) {
      const cost = probe.pendingBlueprint.cost;
      updatedProbe.inventory = {
        Metal: probe.inventory.Metal + cost.Metal,
        Plutonium: probe.inventory.Plutonium + cost.Plutonium,
      };
      updatedProbe.pendingBlueprint = undefined;
      logMsg = `${probe.name} halted replication. Resources refunded.`;
    }

    return {
      ...prev,
      probes: prev.probes.map((p) => (p.id === probe.id ? updatedProbe : p)),
      logs: [...prev.logs, logMsg],
    };
  });
};

/**
 * Start scanning for nearby systems
 */
export const handleScan = (
  setGameState: SetGameState,
  gameState: GameState
) => {
  setGameState((prev) => {
    const probe = prev.probes.find((p) => p.id === prev.selectedProbeId);
    if (!probe || probe.state !== ProbeState.Idle) return prev;

    return {
      ...prev,
      probes: prev.probes.map((p) =>
        p.id === probe.id
          ? {
              ...p,
              state: ProbeState.Scanning,
              progress: 0,
            }
          : p
      ),
      logs: [
        ...prev.logs,
        `${probe.name} initializing wide-band sensor sweep.`,
      ],
    };
  });
};

/**
 * Start probe replication using a blueprint
 */
export const handleReplicate = (
  setGameState: SetGameState,
  gameState: GameState,
  blueprint: ProbeBlueprint
) => {
  setGameState((prev) => {
    const parentProbe = prev.probes.find((p) => p.id === prev.selectedProbeId);
    if (!parentProbe) return prev;

    const cost = blueprint.cost;

    if (
      parentProbe.inventory.Metal < cost.Metal ||
      parentProbe.inventory.Plutonium < cost.Plutonium
    ) {
      return {
        ...prev,
        logs: [...prev.logs, `Replication failed: Insufficient resources.`],
      };
    }

    return {
      ...prev,
      probes: prev.probes.map((p) =>
        p.id === parentProbe.id
          ? {
              ...p,
              state: ProbeState.Replicating,
              progress: 0,
              miningBuffer: 0,
              inventory: {
                Metal: p.inventory.Metal - cost.Metal,
                Plutonium: p.inventory.Plutonium - cost.Plutonium,
              },
              pendingBlueprint: blueprint,
            }
          : p
      ),
      logs: [
        ...prev.logs,
        `${parentProbe.name} starting fabrication of ${blueprint.name}.`,
      ],
    };
  });
};
