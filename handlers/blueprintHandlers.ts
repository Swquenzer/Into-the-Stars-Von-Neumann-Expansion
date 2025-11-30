import React from "react";
import { GameState, ProbeBlueprint } from "../types";

export type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

/**
 * Open the blueprint designer
 */
export const handleOpenDesigner = (
  setGameState: SetGameState,
  blueprint?: ProbeBlueprint
) => {
  setGameState((p) => ({
    ...p,
    isDesignerOpen: true,
    editingBlueprint: blueprint,
  }));
};

/**
 * Close the blueprint designer
 */
export const handleCloseDesigner = (setGameState: SetGameState) => {
  setGameState((p) => ({
    ...p,
    isDesignerOpen: false,
    editingBlueprint: undefined,
  }));
};

/**
 * Save a blueprint (add new or update existing)
 */
export const handleSaveBlueprint = (
  setGameState: SetGameState,
  blueprint: ProbeBlueprint
) => {
  setGameState((prev) => {
    const existingIndex = prev.blueprints.findIndex(
      (b) => b.id === blueprint.id
    );
    let newBlueprints = [...prev.blueprints];
    let logMsg = "";

    if (existingIndex > -1) {
      newBlueprints[existingIndex] = blueprint;
      logMsg = `Blueprint '${blueprint.name}' updated.`;
    } else {
      newBlueprints.push(blueprint);
      logMsg = `New Design '${blueprint.name}' saved to archives.`;
    }

    return {
      ...prev,
      blueprints: newBlueprints,
      isDesignerOpen: false,
      editingBlueprint: undefined,
      logs: [...prev.logs, logMsg],
    };
  });
};

/**
 * Delete a blueprint
 */
export const handleDeleteBlueprint = (
  setGameState: SetGameState,
  blueprintId: string
) => {
  setGameState((prev) => ({
    ...prev,
    blueprints: prev.blueprints.filter((b) => b.id !== blueprintId),
    logs: [...prev.logs, `Blueprint deleted.`],
  }));
};
