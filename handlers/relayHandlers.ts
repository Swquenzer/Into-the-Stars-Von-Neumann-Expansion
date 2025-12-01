import React from "react";
import { GameState, Relay, ProbeState, ResourceType } from "../types";
import { RELAY_DEPLOY_COST_METAL, SCIENCE_UNLOCK_IDS } from "../constants";

export type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

export const handleDeployRelay = (
  setGameState: SetGameState,
  gameState: GameState
) => {
  const selectedProbe = gameState.probes.find(
    (p) => p.id === gameState.selectedProbeId
  );
  if (!selectedProbe) return;

  const hasUnlock = gameState.purchasedUnlocks.includes(
    SCIENCE_UNLOCK_IDS.RELAY_NETWORK
  );
  if (!hasUnlock) return;

  if (selectedProbe.state !== ProbeState.Idle) return;
  if (!selectedProbe.locationId) return;

  const system = gameState.systems.find(
    (s) => s.id === selectedProbe.locationId
  );
  if (!system) return;

  // Check if relay already exists in this system
  const existingRelay = gameState.relays.find((r) => r.systemId === system.id);
  if (existingRelay) return;

  // Check if probe has enough metal
  if (selectedProbe.inventory.Metal < RELAY_DEPLOY_COST_METAL) return;

  const relay: Relay = {
    id: `relay-${Date.now()}`,
    name: `Relay ${gameState.relays.length + 1}`,
    systemId: system.id,
    position: { ...system.position },
    deployedAt: Date.now(),
  };

  setGameState((prev) => ({
    ...prev,
    probes: prev.probes.map((p) =>
      p.id === selectedProbe.id
        ? {
            ...p,
            inventory: {
              ...p.inventory,
              [ResourceType.Metal]: p.inventory.Metal - RELAY_DEPLOY_COST_METAL,
            },
          }
        : p
    ),
    relays: [...prev.relays, relay],
    logs: [
      ...prev.logs,
      `${selectedProbe.name} deployed relay at ${system.name} (-${RELAY_DEPLOY_COST_METAL} Metal).`,
    ],
  }));
};

export const handleRemoveRelay = (
  setGameState: SetGameState,
  gameState: GameState,
  relayId: string
) => {
  const relay = gameState.relays.find((r) => r.id === relayId);
  if (!relay) return;

  setGameState((prev) => ({
    ...prev,
    relays: prev.relays.filter((r) => r.id !== relayId),
    logs: [
      ...prev.logs,
      `Relay removed from ${
        prev.systems.find((s) => s.id === relay.systemId)?.name ||
        relay.systemId
      }.`,
    ],
  }));
};
