import React from "react";
import { GameState } from "../types";

export type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

/**
 * Select a system
 */
export const handleSelectSystem = (
  setGameState: SetGameState,
  systemId: string
) => {
  setGameState((prev) => ({ ...prev, selectedSystemId: systemId }));
};

/**
 * Select a probe
 */
export const handleSelectProbe = (
  setGameState: SetGameState,
  probeId: string
) => {
  setGameState((prev) => ({ ...prev, selectedProbeId: probeId }));
};
