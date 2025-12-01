import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  GameState,
  Probe,
  SolarSystem,
  ResourceType,
  ProbeState,
} from "./types";
import { UNIVERSE_WIDTH, UNIVERSE_HEIGHT } from "./constants";
import { generateProbeName } from "./services/geminiService";
import { StarMap } from "./components/StarMap";
import { ControlPanel } from "./components/ControlPanel";
import { ProbeDesigner } from "./components/ProbeDesigner";
import { createInitialState } from "./utils/gameHelpers";
import { processAutonomousProbe } from "./logic/autonomySystem";
import {
  processTravelingProbe,
  processExploringProbe,
  processMiningProbe,
  processReplicatingProbe,
  processScanningProbe,
  processResearchingProbe,
} from "./logic/gameLoop";
import {
  handleSelectSystem as selectSystem,
  handleSelectProbe as selectProbe,
} from "./handlers/selectionHandlers";
import {
  handleRenameProbe as renameProbe,
  handleToggleAutonomy as toggleAutonomy,
  handleUpgradeProbe as upgradeProbe,
  handleSelfDestruct as selfDestruct,
} from "./handlers/probeHandlers";
import {
  handleLaunch as launchProbe,
  handleDeepSpaceLaunch as deepSpaceLaunch,
} from "./handlers/navigationHandlers";
import {
  handleMine as mineResource,
  handleStopOperation as stopOperation,
  handleScan as scanArea,
  handleReplicate as replicateProbe,
  handleResearch as startResearch,
} from "./handlers/operationHandlers";
import { handleAnalyze as analyzeSystem } from "./handlers/systemHandlers";
import {
  handleExportSave as exportSave,
  handleImportSave as importSave,
} from "./handlers/saveHandlers";
import {
  handleOpenDesigner as openDesigner,
  handleCloseDesigner as closeDesigner,
  handleSaveBlueprint as saveBlueprint,
  handleDeleteBlueprint as deleteBlueprint,
} from "./handlers/blueprintHandlers";
import { handlePurchaseUnlock as purchaseUnlock } from "./handlers/scienceHandlers";
import {
  handleDeployRelay as deployRelay,
  handleRemoveRelay as removeRelay,
} from "./handlers/relayHandlers";
import {
  handleSetAIBehavior as setAIBehavior,
  handleInstallAIModule as installAIModule,
  handleUninstallAIModule as uninstallAIModule,
} from "./handlers/aiBehaviorHandlers";

import { AdminPanel } from "./components/AdminPanel";

export default function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [adminMode, setAdminMode] = useState(true);
  // --- Admin Handler ---
  const handleSetScience = (value: number) => {
    setGameState((prev) => ({ ...prev, science: value }));
  };
  const lastTickRef = useRef<number>(Date.now());
  const rafRef = useRef<number>(0);

  // --- Wrapper functions for handlers ---
  const handleSelectSystem = (id: string) => selectSystem(setGameState, id);
  const handleSelectProbe = (id: string) => selectProbe(setGameState, id);
  const handleRenameProbe = (id: string, newName: string) =>
    renameProbe(setGameState, id, newName);
  const handleToggleAutonomy = (id: string) => toggleAutonomy(setGameState, id);
  const handleAnalyze = (systemId: string) =>
    analyzeSystem(setGameState, gameState, systemId);
  const handleLaunch = (targetSystemId: string) =>
    launchProbe(setGameState, gameState, targetSystemId);
  const handleDeepSpaceLaunch = (heading: number) =>
    deepSpaceLaunch(setGameState, gameState, heading);
  const handleUpgradeProbe = (probeId: string, statKey: any) =>
    upgradeProbe(setGameState, gameState, probeId, statKey);
  const handleMine = (resource: ResourceType) =>
    mineResource(setGameState, gameState, resource);
  const handleStopOperation = () => stopOperation(setGameState, gameState);
  const handleScan = () => scanArea(setGameState, gameState);
  const handleReplicate = (blueprint: any) =>
    replicateProbe(setGameState, gameState, blueprint);
  const handleResearch = () => startResearch(setGameState, gameState);
  const handleOpenDesigner = (blueprint?: any) =>
    openDesigner(setGameState, blueprint);
  const handleCloseDesigner = () => closeDesigner(setGameState);
  const handleSaveBlueprint = (bp: any) => saveBlueprint(setGameState, bp);
  const handleDeleteBlueprint = (id: string) =>
    deleteBlueprint(setGameState, id);
  const handleSelfDestruct = (probeId: string) =>
    selfDestruct(setGameState, gameState, probeId);
  const handleExportSave = () => exportSave(gameState, setGameState);
  const handleImportSave = (file: File) => importSave(file, setGameState);
  const handlePurchaseUnlock = (unlockId: string) =>
    purchaseUnlock(setGameState, gameState, unlockId);
  const handleDeployRelay = () => deployRelay(setGameState, gameState);
  const handleSetAIBehavior = (probeId: string, behavior: any) =>
    setAIBehavior(setGameState, gameState, probeId, behavior);
  const handleInstallAIModule = (probeId: string, behavior: any) =>
    installAIModule(setGameState, gameState, probeId, behavior);
  const handleUninstallAIModule = (probeId: string, behavior: any) =>
    uninstallAIModule(setGameState, gameState, probeId, behavior);
  const handleRemoveRelay = (relayId: string) =>
    removeRelay(setGameState, gameState, relayId);

  // --- Game Loop ---
  const tick = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;

    setGameState((prev) => {
      let systemsChanged = false;
      let generatedSectorsChanged = false;
      const newSystems = [...prev.systems];
      const newGeneratedSectors = new Set<string>(prev.generatedSectors);
      const newLogs: string[] = [];
      let scienceDeltaTotal = 0;
      const finalProbes: Probe[] = [];
      const createdProbes: Probe[] = [];

      const colonizedSystemIds = new Set<string>();
      prev.probes.forEach((p) => {
        if (p.originSystemId) colonizedSystemIds.add(p.originSystemId);
      });

      const earthPos = prev.systems.find((s) => s.id === "sys-earth")
        ?.position || { x: UNIVERSE_WIDTH / 2, y: UNIVERSE_HEIGHT / 2 };

      prev.probes.forEach((probe) => {
        let updatedProbe = { ...probe };

        // --- AUTONOMOUS PROBE LOGIC ---
        // Only run for Idle, Traveling, Exploring, Scanning, Researching, and Replicating states
        // Mining states are handled within processMiningProbe when resources transfer
        if (
          probe.stats.autonomyLevel > 0 &&
          probe.isAutonomyEnabled &&
          probe.state !== ProbeState.MiningMetal &&
          probe.state !== ProbeState.MiningPlutonium
        ) {
          const hasRelayUnlock =
            prev.purchasedUnlocks?.includes("quantum_relay_network") || false;
          const autonomyResult = processAutonomousProbe(
            updatedProbe,
            newSystems,
            colonizedSystemIds,
            now,
            prev.relays || [],
            hasRelayUnlock
          );
          updatedProbe = autonomyResult.probe;

          if (autonomyResult.logMessage) {
            newLogs.push(autonomyResult.logMessage);
          }

          if (autonomyResult.systemChanges) {
            autonomyResult.systemChanges.forEach((change) => {
              const idx = newSystems.findIndex((s) => s.id === change.systemId);
              if (idx > -1) {
                newSystems[idx] = { ...newSystems[idx], ...change.changes };
                systemsChanged = true;
              }
            });
          }

          // Handle replication initiation
          if (
            autonomyResult.shouldReplicate &&
            autonomyResult.replicationThresholds
          ) {
            const thresholds = autonomyResult.replicationThresholds;
            updatedProbe.state = ProbeState.Replicating;
            updatedProbe.progress = 0;
            updatedProbe.pendingBlueprint = {
              id: `auto-bp-${Date.now()}`,
              name: updatedProbe.model,
              stats: updatedProbe.stats,
              cost: {
                Metal: thresholds.metal,
                Plutonium: thresholds.plutonium,
                time: thresholds.time,
              },
              isCustom: true,
            };
            updatedProbe.inventory.Metal -= thresholds.metal;
            updatedProbe.inventory.Plutonium -= thresholds.plutonium;
            colonizedSystemIds.add(updatedProbe.locationId!);
          }
        }

        // --- STATE PROCESSING ---
        if (
          updatedProbe.state === ProbeState.Traveling &&
          updatedProbe.targetSystemId &&
          updatedProbe.locationId
        ) {
          const result = processTravelingProbe(updatedProbe, newSystems, delta);
          updatedProbe = result.probe;
          newLogs.push(...result.logMessages);
          result.systemUpdates.forEach((update) => {
            newSystems[update.index] = {
              ...newSystems[update.index],
              ...update.updates,
            };
            systemsChanged = true;
          });
        } else if (
          updatedProbe.state === ProbeState.Exploring &&
          updatedProbe.heading !== undefined
        ) {
          const result = processExploringProbe(
            updatedProbe,
            newSystems,
            newGeneratedSectors,
            earthPos,
            delta,
            now
          );
          updatedProbe = result.probe;
          newLogs.push(...result.logMessages);
          result.systemUpdates.forEach((update) => {
            newSystems[update.index] = {
              ...newSystems[update.index],
              ...update.updates,
            };
            systemsChanged = true;
          });
          if (result.sectorGenerated) {
            newSystems.push(...result.newSystems);
            generatedSectorsChanged = true;
            systemsChanged = true;
          }
        } else if (
          updatedProbe.state === ProbeState.MiningMetal ||
          updatedProbe.state === ProbeState.MiningPlutonium
        ) {
          const result = processMiningProbe(updatedProbe, newSystems, delta);
          updatedProbe = result.probe;
          newLogs.push(...result.logMessages);
          if (result.systemYieldUpdate) {
            const update = result.systemYieldUpdate;
            const sys = newSystems[update.index];
            newSystems[update.index] = {
              ...sys,
              resourceYield: {
                ...sys.resourceYield,
                [update.resourceType]: update.newYield,
              },
            };
            systemsChanged = true;
          }
          // Check autonomy after resources were transferred
          if (result.shouldCheckAutonomy && updatedProbe.stats.autonomyLevel > 0 && updatedProbe.isAutonomyEnabled) {
            const hasRelayUnlock = prev.purchasedUnlocks?.includes("quantum_relay_network") || false;
            const autonomyResult = processAutonomousProbe(
              updatedProbe,
              newSystems,
              colonizedSystemIds,
              now,
              prev.relays || [],
              hasRelayUnlock
            );
            updatedProbe = autonomyResult.probe;
            if (autonomyResult.logMessage) {
              newLogs.push(autonomyResult.logMessage);
            }
            if (autonomyResult.systemChanges) {
              autonomyResult.systemChanges.forEach((change) => {
                const idx = newSystems.findIndex((s) => s.id === change.systemId);
                if (idx > -1) {
                  newSystems[idx] = { ...newSystems[idx], ...change.changes };
                  systemsChanged = true;
                }
              });
            }
          }
        } else if (updatedProbe.state === ProbeState.Replicating) {
          const result = processReplicatingProbe(
            updatedProbe,
            delta,
            colonizedSystemIds
          );
          updatedProbe = result.probe;
          newLogs.push(...result.logMessages);

          if (result.newProbes.length > 0) {
            createdProbes.push(...result.newProbes);

            // Generate AI names asynchronously for non-custom probes
            result.newProbes.forEach((newProbe) => {
              if (newProbe.name === "Constructing...") {
                generateProbeName(newProbe.model).then((name) => {
                  setGameState((g) => ({
                    ...g,
                    probes: g.probes.map((p) =>
                      p.id === newProbe.id ? { ...p, name } : p
                    ),
                  }));
                });
              }
            });
          }
        } else if (updatedProbe.state === ProbeState.Scanning) {
          const result = processScanningProbe(
            updatedProbe,
            newSystems,
            newGeneratedSectors,
            earthPos,
            delta
          );
          updatedProbe = result.probe;
          newLogs.push(...result.logMessages);
          result.systemUpdates.forEach((update) => {
            newSystems[update.index] = {
              ...newSystems[update.index],
              ...update.updates,
            };
            systemsChanged = true;
          });
          if (result.sectorGenerated) {
            newSystems.push(...result.newSystems);
            generatedSectorsChanged = true;
            systemsChanged = true;
          }
        } else if (updatedProbe.state === ProbeState.Researching) {
          const result = processResearchingProbe(
            updatedProbe,
            newSystems,
            delta
          );
          updatedProbe = result.probe;
          newLogs.push(...result.logMessages);
          result.systemUpdates.forEach((update) => {
            newSystems[update.index] = {
              ...newSystems[update.index],
              ...update.updates,
            };
            systemsChanged = true;
          });
          if (result.scienceDelta) scienceDeltaTotal += result.scienceDelta;
        }

        finalProbes.push(updatedProbe);
      });

      return {
        ...prev,
        systems: systemsChanged ? newSystems : prev.systems,
        probes: [...finalProbes, ...createdProbes],
        generatedSectors: generatedSectorsChanged
          ? newGeneratedSectors
          : prev.generatedSectors,
        science:
          scienceDeltaTotal !== 0
            ? prev.science + scienceDeltaTotal
            : prev.science,
        logs: newLogs.length > 0 ? [...prev.logs, ...newLogs] : prev.logs,
      };
    });

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return (
    <div className="flex w-screen h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* AdminPanel only, no top-right toggle */}
      {adminMode && (
        <AdminPanel gameState={gameState} onSetScience={handleSetScience} />
      )}

      <div className="flex-1 relative">
        <StarMap
          gameState={gameState}
          onSystemSelect={handleSelectSystem}
          onProbeSelect={handleSelectProbe}
        />
      </div>
      <ControlPanel
        gameState={gameState}
        onLaunch={handleLaunch}
        onDeepSpaceLaunch={handleDeepSpaceLaunch}
        onMine={handleMine}
        onStopOperation={handleStopOperation}
        onReplicate={handleReplicate}
        onResearch={handleResearch}
        onAnalyze={handleAnalyze}
        onSystemSelect={handleSelectSystem}
        onProbeSelect={handleSelectProbe}
        onRenameProbe={handleRenameProbe}
        onScan={handleScan}
        onOpenDesigner={handleOpenDesigner}
        onDeleteBlueprint={handleDeleteBlueprint}
        onUpgradeProbe={handleUpgradeProbe}
        onSelfDestruct={handleSelfDestruct}
        onToggleAutonomy={handleToggleAutonomy}
        onPurchaseUnlock={handlePurchaseUnlock}
        onDeployRelay={handleDeployRelay}
        onRemoveRelay={handleRemoveRelay}
        onSetAIBehavior={handleSetAIBehavior}
        onInstallAIModule={handleInstallAIModule}
        onUninstallAIModule={handleUninstallAIModule}
        onExportSave={handleExportSave}
        onImportSave={handleImportSave}
      />
      {gameState.isDesignerOpen && (
        <ProbeDesigner
          initialBlueprint={gameState.editingBlueprint}
          onClose={handleCloseDesigner}
          onSave={handleSaveBlueprint}
        />
      )}
    </div>
  );
}
