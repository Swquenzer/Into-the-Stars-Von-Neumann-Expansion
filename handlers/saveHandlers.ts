import React from "react";
import { GameState } from "../types";

export type SetGameState = React.Dispatch<React.SetStateAction<GameState>>;

/**
 * Export game state to JSON file
 */
export const handleExportSave = (
  gameState: GameState,
  setGameState: SetGameState
) => {
  const dataToSave = {
    ...gameState,
    generatedSectors: Array.from(gameState.generatedSectors),
    purchasedUnlocks: gameState.purchasedUnlocks || [],
    maxStatLevelOverrides: gameState.maxStatLevelOverrides || {},
    isDesignerOpen: false,
    editingBlueprint: undefined,
  };

  const jsonString = JSON.stringify(dataToSave, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `von-neumann-save-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  setGameState((prev) => ({
    ...prev,
    logs: [...prev.logs, "Game state exported successfully."],
  }));
};

/**
 * Import game state from JSON file
 */
export const handleImportSave = (file: File, setGameState: SetGameState) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      const loadedData = JSON.parse(text);

      if (!loadedData.systems || !loadedData.probes) {
        throw new Error("Invalid save file format.");
      }

      // Deserialize generatedSectors from Array to Set
      if (
        loadedData.generatedSectors &&
        Array.isArray(loadedData.generatedSectors)
      ) {
        loadedData.generatedSectors = new Set(loadedData.generatedSectors);
      } else {
        loadedData.generatedSectors = new Set();
      }

      // Ensure science unlock fields exist
      if (!loadedData.purchasedUnlocks) {
        loadedData.purchasedUnlocks = [];
      }
      if (!loadedData.maxStatLevelOverrides) {
        loadedData.maxStatLevelOverrides = {};
      }

      setGameState({
        ...loadedData,
        isDesignerOpen: false,
        editingBlueprint: undefined,
        logs: [...(loadedData.logs || []), "Game loaded successfully."],
      });
    } catch (error) {
      console.error("Failed to load save file:", error);
      setGameState((prev) => ({
        ...prev,
        logs: [
          ...prev.logs,
          "Error loading save file. Check console for details.",
        ],
      }));
    }
  };
  reader.readAsText(file);
};
