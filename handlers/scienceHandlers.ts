import React from "react";
import { GameState, AIBehavior } from "../types";
import {
  SCIENCE_UNLOCKS,
  MAX_STAT_LEVELS,
  SCIENCE_UNLOCK_IDS,
} from "../constants";

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

    // Handle AI behavior module unlocks
    let newUnlockedBehaviors = [...(prev.unlockedAIBehaviors || [])];
    if (unlockId === SCIENCE_UNLOCK_IDS.FOCUS_MINING_MODULE) {
      newUnlockedBehaviors.push(AIBehavior.FocusMining);
    } else if (unlockId === SCIENCE_UNLOCK_IDS.FOCUS_EXPLORING_MODULE) {
      newUnlockedBehaviors.push(AIBehavior.FocusExploring);
    } else if (unlockId === SCIENCE_UNLOCK_IDS.FOCUS_SCIENCE_MODULE) {
      newUnlockedBehaviors.push(AIBehavior.FocusScience);
    }

    return {
      ...prev,
      science: prev.science - unlock.cost,
      purchasedUnlocks: [...prev.purchasedUnlocks, unlockId],
      maxStatLevelOverrides: newMaxStatOverrides,
      unlockedAIBehaviors: newUnlockedBehaviors,
      logs: [...prev.logs, `Research breakthrough: ${unlock.name} unlocked!`],
    };
  });
};
