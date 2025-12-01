import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  GameState,
  ResourceType,
  ProbeBlueprint,
  ProbeStats,
  ProbeState,
} from "../types";
import {
  Radio,
  Activity,
  Terminal,
  Satellite,
  Upload,
  Download,
  Beaker,
} from "lucide-react";

import { ProbesListPanel } from "./panels/ProbesListPanel";
import { SystemsListPanel } from "./panels/SystemsListPanel";
import { OperationsListPanel } from "./panels/OperationsListPanel";
import { LogsListPanel } from "./panels/LogsListPanel";
import { SciencePanel } from "./panels/SciencePanel";
import { RelaysListPanel } from "./panels/RelaysListPanel";

interface ControlPanelProps {
  gameState: GameState;
  onLaunch: (targetSystemId: string) => void;
  onDeepSpaceLaunch: (heading: number) => void;
  onMine: (resource: ResourceType) => void;
  onStopOperation: () => void;
  onReplicate: (blueprint: ProbeBlueprint) => void;
  onResearch: () => void;
  onAnalyze: (systemId: string) => void;
  onSystemSelect: (id: string) => void;
  onProbeSelect: (id: string) => void;
  onRenameProbe: (id: string, newName: string) => void;
  onScan: () => void;
  onOpenDesigner: (blueprint?: ProbeBlueprint) => void;
  onDeleteBlueprint: (id: string) => void;
  onUpgradeProbe: (probeId: string, stat: keyof ProbeStats) => void;
  onSelfDestruct: (probeId: string) => void;
  onToggleAutonomy: (probeId: string) => void;
  onPurchaseUnlock: (unlockId: string) => void;
  onDeployRelay: () => void;
  onRemoveRelay: (relayId: string) => void;
  onExportSave: () => void;
  onImportSave: (file: File) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  gameState,
  onLaunch,
  onDeepSpaceLaunch,
  onMine,
  onStopOperation,
  onReplicate,
  onResearch,
  onAnalyze,
  onSystemSelect,
  onProbeSelect,
  onRenameProbe,
  onScan,
  onOpenDesigner,
  onDeleteBlueprint,
  onUpgradeProbe,
  onSelfDestruct,
  onToggleAutonomy,
  onPurchaseUnlock,
  onDeployRelay,
  onRemoveRelay,
  onExportSave,
  onImportSave,
}) => {
  const {
    probes,
    systems,
    blueprints,
    selectedProbeId,
    selectedSystemId,
    logs,
    science,
  } = gameState;
  const [activeTabs, setActiveTabs] = useState<Record<string, boolean>>({
    probes: true,
    systems: true,
    operations: false,
    logs: false,
    science: false,
    relays: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track the previous number of active probes to detect new operations
  const activeProbesCount = useMemo(
    () => probes.filter((p) => p.state !== ProbeState.Idle).length,
    [probes]
  );
  const prevActiveCount = useRef(activeProbesCount);

  // Auto-expand Operations panel when a new operation starts
  useEffect(() => {
    if (activeProbesCount > prevActiveCount.current) {
      setActiveTabs((prev) => ({ ...prev, operations: true }));
    }
    prevActiveCount.current = activeProbesCount;
  }, [activeProbesCount]);

  // Auto-expand panels when selection changes
  useEffect(() => {
    if (selectedProbeId) {
      setActiveTabs((prev) => ({ ...prev, probes: true }));
    }
  }, [selectedProbeId]);

  useEffect(() => {
    if (selectedSystemId) {
      setActiveTabs((prev) => ({ ...prev, systems: true }));
    }
  }, [selectedSystemId]);

  const toggleTab = (tab: string) => {
    setActiveTabs((prev) => ({ ...prev, [tab]: !prev[tab] }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportSave(e.target.files[0]);
    }
    // Reset value so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-full bg-slate-900 border-l border-slate-800 shadow-xl z-20 pointer-events-auto">
      {/* 1. Content Area (Panels side-by-side) */}
      <div className="flex h-full">
        {activeTabs.probes && (
          <div className="w-80 h-full border-r border-slate-800">
            <ProbesListPanel
              probes={probes}
              systems={systems}
              blueprints={blueprints}
              selectedProbeId={selectedProbeId}
              maxStatLevelOverrides={gameState.maxStatLevelOverrides}
              purchasedUnlocks={gameState.purchasedUnlocks}
              relays={gameState.relays}
              onProbeSelect={onProbeSelect}
              onSystemSelect={onSystemSelect}
              onMine={onMine}
              onStopOperation={onStopOperation}
              onReplicate={onReplicate}
              onRenameProbe={onRenameProbe}
              onScan={onScan}
              onResearch={onResearch}
              onOpenDesigner={onOpenDesigner}
              onDeleteBlueprint={onDeleteBlueprint}
              onDeepSpaceLaunch={onDeepSpaceLaunch}
              onUpgradeProbe={onUpgradeProbe}
              onSelfDestruct={onSelfDestruct}
              onToggleAutonomy={onToggleAutonomy}
              onDeployRelay={onDeployRelay}
            />
          </div>
        )}

        {activeTabs.systems && (
          <div className="w-80 h-full border-r border-slate-800">
            <SystemsListPanel
              systems={systems}
              probes={probes}
              relays={gameState.relays}
              selectedSystemId={selectedSystemId}
              selectedProbeId={selectedProbeId}
              onSystemSelect={onSystemSelect}
              onProbeSelect={onProbeSelect}
              onAnalyze={onAnalyze}
              onLaunch={onLaunch}
              onDeepSpaceLaunch={onDeepSpaceLaunch}
            />
          </div>
        )}

        {activeTabs.logs && (
          <div className="w-72 h-full border-r border-slate-800">
            <LogsListPanel logs={logs} />
          </div>
        )}

        {activeTabs.science && (
          <div className="w-80 h-full border-r border-slate-800">
            <SciencePanel
              gameState={gameState}
              onPurchaseUnlock={onPurchaseUnlock}
            />
          </div>
        )}

        {activeTabs.relays && (
          <div className="w-80 h-full border-r border-slate-800">
            <RelaysListPanel
              relays={gameState.relays}
              systems={systems}
              onSystemSelect={onSystemSelect}
              onRemoveRelay={onRemoveRelay}
            />
          </div>
        )}

        {activeTabs.operations && (
          <div className="w-72 h-full border-r border-slate-800">
            <OperationsListPanel
              probes={probes}
              systems={systems}
              onProbeSelect={onProbeSelect}
            />
          </div>
        )}
      </div>

      {/* 2. Sidebar Tabs (Right side) */}
      <div className="w-12 flex flex-col items-center py-2 gap-2 bg-slate-950 flex-none h-full">
        <button
          onClick={() => toggleTab("probes")}
          className={`p-2 rounded-lg transition-colors ${
            activeTabs.probes
              ? "bg-cyan-900/50 text-cyan-400"
              : "text-slate-600 hover:bg-slate-900"
          }`}
          title="Probes Panel"
        >
          <Satellite size={20} />
        </button>
        <button
          onClick={() => toggleTab("systems")}
          className={`p-2 rounded-lg transition-colors ${
            activeTabs.systems
              ? "bg-amber-900/50 text-amber-400"
              : "text-slate-600 hover:bg-slate-900"
          }`}
          title="Systems Panel"
        >
          <Radio size={20} />
        </button>
        <button
          onClick={() => toggleTab("operations")}
          className={`p-2 rounded-lg transition-colors ${
            activeTabs.operations
              ? "bg-emerald-900/50 text-emerald-400"
              : "text-slate-600 hover:bg-slate-900"
          }`}
          title="Current Operations"
        >
          <Activity size={20} />
        </button>
        <button
          onClick={() => toggleTab("science")}
          className={`p-2 rounded-lg transition-colors ${
            activeTabs.science
              ? "bg-emerald-900/50 text-emerald-400"
              : "text-slate-600 hover:bg-slate-900"
          }`}
          title="Research Tree"
        >
          <Beaker size={20} />
        </button>
        <button
          onClick={() => toggleTab("relays")}
          className={`p-2 rounded-lg transition-colors ${
            activeTabs.relays
              ? "bg-purple-900/50 text-purple-400"
              : "text-slate-600 hover:bg-slate-900"
          }`}
          title="Relay Network"
        >
          <Radio size={20} />
        </button>

        <div className="flex-1" />

        <button
          onClick={() => toggleTab("logs")}
          className={`p-2 rounded-lg transition-colors ${
            activeTabs.logs
              ? "bg-slate-800 text-slate-200"
              : "text-slate-600 hover:bg-slate-900"
          }`}
          title="Mission Logs"
        >
          <Terminal size={20} />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json"
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg transition-colors text-slate-600 hover:bg-slate-900 hover:text-emerald-400"
          title="Load Game Save"
        >
          <Upload size={20} />
        </button>

        <button
          onClick={onExportSave}
          className="p-2 rounded-lg transition-colors text-slate-600 hover:bg-slate-900 hover:text-cyan-400 mb-2"
          title="Export Save Game"
        >
          <Download size={20} />
        </button>
      </div>
    </div>
  );
};
