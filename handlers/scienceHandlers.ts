import React from "react";
import { GameState } from "../types";
import { SCIENCE_UNLOCKS, MAX_STAT_LEVELS } from "../constants";

export type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

/**
 * Purchase a science unlock
 */
export const handlePurchaseUnlock = (
  setGameState: SetGameState,
  gameState: GameState,
  unlockId: string
) => {
  setGameState((prev) => {
    const unlock = SCIENCE_UNLOCKS.find((u) => u.id === unlockId);
    if (!unlock) return prev;

    // Validation
    if (prev.purchasedUnlocks.includes(unlockId)) {
      return {
        ...prev,
        logs: [...prev.logs, `Unlock already purchased: ${unlock.name}`],
      };
    }

    if (prev.science < unlock.cost) {
      return {
        ...prev,
        logs: [...prev.logs, `Insufficient science for ${unlock.name}`],
      };
    }

    // Check prerequisites
    if (unlock.prerequisites) {
      const missingPrereqs = unlock.prerequisites.filter(
        (prereqId) => !prev.purchasedUnlocks.includes(prereqId)
      );
      if (missingPrereqs.length > 0) {
        return {
          ...prev,
          logs: [
            ...prev.logs,
            `Cannot purchase ${unlock.name}: missing prerequisites`,
          ],
        };
      }
    }

    // Apply unlock effect
    let newMaxStatOverrides = { ...prev.maxStatLevelOverrides };
    if (unlock.effect.type === "increase_max_level" && unlock.effect.target) {
      const currentMax =
        prev.maxStatLevelOverrides[unlock.effect.target] ??
        MAX_STAT_LEVELS[unlock.effect.target];
      newMaxStatOverrides[unlock.effect.target] =
        currentMax + (unlock.effect.value || 0);
    }

    return {
      ...prev,
      science: prev.science - unlock.cost,
      purchasedUnlocks: [...prev.purchasedUnlocks, unlockId],
      maxStatLevelOverrides: newMaxStatOverrides,
      logs: [...prev.logs, `Research breakthrough: ${unlock.name} unlocked!`],
    };
  });
};
