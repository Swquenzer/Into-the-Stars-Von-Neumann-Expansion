import React from "react";
import { GameState, ResourceType, ProbeState } from "../types";
import {
  STORAGE_CAPACITY_BASE,
  STORAGE_BUILD_COST,
  TRANSFER_RATE_MAX,
  SCIENCE_UNLOCK_IDS,
} from "../constants";

export type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

export const handleBuildStorageFacility = (
  setGameState: SetGameState,
  gameState: GameState
) => {
  setGameState((prev) => {
    const probe = prev.probes.find((p) => p.id === prev.selectedProbeId);
    if (!probe) return prev;

    // Unlock gate
    const hasUnlock = prev.purchasedUnlocks.includes(
      SCIENCE_UNLOCK_IDS.PLANETARY_LOGISTICS
    );
    if (!hasUnlock) {
      return {
        ...prev,
        logs: [...prev.logs, "Build failed: Planetary Logistics not unlocked."],
      };
    }

    // Must be idle and docked
    if (probe.state !== ProbeState.Idle || !probe.locationId) {
      return {
        ...prev,
        logs: [
          ...prev.logs,
          "Build failed: Probe must be Idle and docked at a system.",
        ],
      };
    }

    const systemIndex = prev.systems.findIndex((s) => s.id === probe.locationId);
    if (systemIndex < 0) return prev;
    const system = prev.systems[systemIndex];

    if (system.storageFacility) {
      return {
        ...prev,
        logs: [...prev.logs, `Build failed: ${system.name} already has storage.`],
      };
    }

    // Resource cost
    if (
      probe.inventory.Metal < STORAGE_BUILD_COST.Metal ||
      probe.inventory.Plutonium < STORAGE_BUILD_COST.Plutonium
    ) {
      return {
        ...prev,
        logs: [
          ...prev.logs,
          "Build failed: Insufficient resources (600 Metal, 100 Plutonium).",
        ],
      };
    }

    const updatedProbe = {
      ...probe,
      inventory: {
        Metal: probe.inventory.Metal - STORAGE_BUILD_COST.Metal,
        Plutonium: probe.inventory.Plutonium - STORAGE_BUILD_COST.Plutonium,
      },
    };

    const newFacility = {
      Metal: 0,
      Plutonium: 0,
      capacity: STORAGE_CAPACITY_BASE,
    };

    const newSystems = [...prev.systems];
    newSystems[systemIndex] = {
      ...system,
      storageFacility: newFacility,
    };

    return {
      ...prev,
      systems: newSystems,
      probes: prev.probes.map((p) => (p.id === probe.id ? updatedProbe : p)),
      logs: [
        ...prev.logs,
        `${probe.name} built storage facility at ${system.name}. (-${STORAGE_BUILD_COST.Metal}M, -${STORAGE_BUILD_COST.Plutonium}P)`,
      ],
    };
  });
};

export const handleDepositToStorage = (
  setGameState: SetGameState,
  gameState: GameState,
  amount: number,
  resourceType: ResourceType
) => {
  setGameState((prev) => {
    const probe = prev.probes.find((p) => p.id === prev.selectedProbeId);
    if (!probe) return prev;

    if (probe.state !== ProbeState.Idle || !probe.locationId) {
      return {
        ...prev,
        logs: [
          ...prev.logs,
          "Deposit failed: Probe must be Idle and docked.",
        ],
      };
    }

    const sysIndex = prev.systems.findIndex((s) => s.id === probe.locationId);
    if (sysIndex < 0) return prev;
    const system = prev.systems[sysIndex];
    const facility = system.storageFacility;
    if (!facility) {
      return {
        ...prev,
        logs: [...prev.logs, `Deposit failed: No storage facility at ${system.name}.`],
      };
    }

    const available = resourceType === ResourceType.Metal ? probe.inventory.Metal : probe.inventory.Plutonium;
    const remainingCapacity = Math.max(
      0,
      facility.capacity - (facility.Metal + facility.Plutonium)
    );

    const requested = Math.max(0, Math.min(amount, TRANSFER_RATE_MAX));
    const transfer = Math.min(requested, available, remainingCapacity);

    if (transfer <= 0) {
      const reason = available <= 0 ? "Insufficient probe inventory." : remainingCapacity <= 0 ? "Storage full." : "Invalid amount.";
      return { ...prev, logs: [...prev.logs, `Deposit failed: ${reason}`] };
    }

    const updatedProbe = { ...probe };
    const updatedFacility = { ...facility };
    if (resourceType === ResourceType.Metal) {
      updatedProbe.inventory.Metal -= transfer;
      updatedFacility.Metal += transfer;
    } else {
      updatedProbe.inventory.Plutonium -= transfer;
      updatedFacility.Plutonium += transfer;
    }

    const newSystems = [...prev.systems];
    newSystems[sysIndex] = { ...system, storageFacility: updatedFacility };

    return {
      ...prev,
      systems: newSystems,
      probes: prev.probes.map((p) => (p.id === probe.id ? updatedProbe : p)),
      logs: [
        ...prev.logs,
        `${probe.name} deposited ${Math.floor(transfer)} ${resourceType} to ${system.name}.`,
      ],
    };
  });
};

export const handleWithdrawFromStorage = (
  setGameState: SetGameState,
  gameState: GameState,
  amount: number,
  resourceType: ResourceType
) => {
  setGameState((prev) => {
    const probe = prev.probes.find((p) => p.id === prev.selectedProbeId);
    if (!probe) return prev;

    if (probe.state !== ProbeState.Idle || !probe.locationId) {
      return {
        ...prev,
        logs: [
          ...prev.logs,
          "Withdraw failed: Probe must be Idle and docked.",
        ],
      };
    }

    const sysIndex = prev.systems.findIndex((s) => s.id === probe.locationId);
    if (sysIndex < 0) return prev;
    const system = prev.systems[sysIndex];
    const facility = system.storageFacility;
    if (!facility) {
      return {
        ...prev,
        logs: [...prev.logs, `Withdraw failed: No storage facility at ${system.name}.`],
      };
    }

    const availableInFacility = resourceType === ResourceType.Metal ? facility.Metal : facility.Plutonium;
    const requested = Math.max(0, Math.min(amount, TRANSFER_RATE_MAX));
    const transfer = Math.min(requested, availableInFacility);

    if (transfer <= 0) {
      const reason = availableInFacility <= 0 ? "Facility empty." : "Invalid amount.";
      return { ...prev, logs: [...prev.logs, `Withdraw failed: ${reason}`] };
    }

    const updatedProbe = { ...probe };
    const updatedFacility = { ...facility };
    if (resourceType === ResourceType.Metal) {
      updatedProbe.inventory.Metal += transfer;
      updatedFacility.Metal -= transfer;
    } else {
      updatedProbe.inventory.Plutonium += transfer;
      updatedFacility.Plutonium -= transfer;
    }

    const newSystems = [...prev.systems];
    newSystems[sysIndex] = { ...system, storageFacility: updatedFacility };

    return {
      ...prev,
      systems: newSystems,
      probes: prev.probes.map((p) => (p.id === probe.id ? updatedProbe : p)),
      logs: [
        ...prev.logs,
        `${probe.name} withdrew ${Math.floor(transfer)} ${resourceType} from ${system.name}.`,
      ],
    };
  });
};
