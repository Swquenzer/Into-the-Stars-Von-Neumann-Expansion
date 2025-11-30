import React from "react";
import { GameState, ProbeState } from "../types";
import { FUEL_CONSUMPTION_RATE, TURN_COST_PER_DEGREE } from "../constants";

export type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

/**
 * Launch probe to a known system
 */
export const handleLaunch = (
  setGameState: SetGameState,
  gameState: GameState,
  targetSystemId: string
) => {
  setGameState((prev) => {
    const probe = prev.probes.find((p) => p.id === prev.selectedProbeId);
    const startSys = prev.systems.find((s) => s.id === probe?.locationId);
    const targetSys = prev.systems.find((s) => s.id === targetSystemId);

    if (!probe || !startSys || !targetSys) return prev;

    const dist = Math.sqrt(
      Math.pow(targetSys.position.x - startSys.position.x, 2) +
        Math.pow(targetSys.position.y - startSys.position.y, 2)
    );
    const fuelNeeded = Math.floor(dist * FUEL_CONSUMPTION_RATE);

    const hasFuel = probe.inventory.Plutonium >= fuelNeeded;

    const updatedProbe = {
      ...probe,
      state: ProbeState.Traveling,
      targetSystemId: targetSys.id,
      inventory: {
        ...probe.inventory,
        Plutonium: hasFuel
          ? probe.inventory.Plutonium - fuelNeeded
          : probe.inventory.Plutonium,
      },
      progress: 0,
      miningBuffer: 0,
      isSolarSailing: !hasFuel,
    };

    const logMsg = hasFuel
      ? `${probe.name} launching to ${targetSys.name}.`
      : `${probe.name} deploying solar sails for slow transit to ${targetSys.name}.`;

    return {
      ...prev,
      probes: prev.probes.map((p) => (p.id === probe.id ? updatedProbe : p)),
      logs: [...prev.logs, logMsg],
    };
  });
};

/**
 * Launch probe into deep space or adjust course while exploring
 */
export const handleDeepSpaceLaunch = (
  setGameState: SetGameState,
  gameState: GameState,
  heading: number
) => {
  setGameState((prev) => {
    const probe = prev.probes.find((p) => p.id === prev.selectedProbeId);
    if (!probe) return prev;

    // CASE 1: Launch from Idle
    if (probe.state === ProbeState.Idle) {
      const rad = (heading * Math.PI) / 180;
      const pushDistance = 10;
      const newPos = {
        x: probe.position.x + Math.cos(rad) * pushDistance,
        y: probe.position.y + Math.sin(rad) * pushDistance,
      };

      const isLowFuel = probe.inventory.Plutonium <= 0;

      return {
        ...prev,
        probes: prev.probes.map((p) =>
          p.id === probe.id
            ? {
                ...p,
                state: ProbeState.Exploring,
                heading: heading,
                locationId: null,
                targetSystemId: null,
                position: newPos,
                lastSafetyCheck: Date.now(),
                lastDiversionCheck: Date.now(),
                isSolarSailing: isLowFuel,
              }
            : p
        ),
        logs: [
          ...prev.logs,
          `${probe.name} engaging ${
            isLowFuel ? "solar sails" : "thrusters"
          } on heading ${heading}°.`,
        ],
      };
    }

    // CASE 2: Adjust Course while Exploring
    if (probe.state === ProbeState.Exploring) {
      const currentHeading = probe.heading || 0;
      let diff = Math.abs(heading - currentHeading);
      if (diff > 180) diff = 360 - diff;
      const cost = Math.ceil(diff * TURN_COST_PER_DEGREE);

      let newPlutonium = probe.inventory.Plutonium - cost;
      let isSailing = probe.isSolarSailing;
      let logMessage = `${probe.name} adjusted course to ${heading}°. Burned ${cost} Pu.`;

      if (newPlutonium < 0) {
        newPlutonium = 0;
        isSailing = true;
        logMessage = `Emergency maneuver executed. Fuel depleted. ${probe.name} switching to solar sails.`;
      }

      return {
        ...prev,
        probes: prev.probes.map((p) =>
          p.id === probe.id
            ? {
                ...p,
                heading: heading,
                inventory: { ...p.inventory, Plutonium: newPlutonium },
                isSolarSailing: isSailing,
              }
            : p
        ),
        logs: [...prev.logs, logMessage],
      };
    }

    return prev;
  });
};
