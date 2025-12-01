import React, { useState, useMemo, useEffect } from "react";
import {
  Probe,
  SolarSystem,
  ResourceType,
  ProbeState,
  ProbeBlueprint,
  ProbeStats,
  Relay,
} from "../../types";
import {
  TURN_COST_PER_DEGREE,
  UPGRADE_COSTS,
  MAX_STAT_LEVELS,
  RELAY_DEPLOY_COST_METAL,
  SCIENCE_UNLOCK_IDS,
} from "../../constants";
import {
  Rocket,
  Pickaxe,
  Hammer,
  Radar,
  BrainCircuit,
  Pause,
  MapPin,
  Satellite,
  Pencil,
  Check,
  X,
  Radiation,
  Zap,
  Trash2,
  Compass,
  Navigation,
  Wind,
  Skull,
  Plus,
  AlertCircle,
  Clock,
  Activity,
  Power,
} from "lucide-react";

export interface ProbesPanelProps {
  probes: Probe[];
  systems: SolarSystem[];
  blueprints: ProbeBlueprint[];
  selectedProbeId: string | null;
  maxStatLevelOverrides: Partial<Record<keyof ProbeStats, number>>;
  purchasedUnlocks: string[];
  relays: Relay[];
  onProbeSelect: (id: string) => void;
  onSystemSelect: (id: string) => void;
  onMine: (resource: ResourceType) => void;
  onStopOperation: () => void;
  onReplicate: (blueprint: ProbeBlueprint) => void;
  onRenameProbe: (id: string, newName: string) => void;
  onScan: () => void;
  onResearch: () => void;
  onOpenDesigner: (blueprint?: ProbeBlueprint) => void;
  onDeleteBlueprint: (id: string) => void;
  onDeepSpaceLaunch: (heading: number) => void;
  onUpgradeProbe: (probeId: string, stat: keyof ProbeStats) => void;
  onSelfDestruct: (probeId: string) => void;
  onToggleAutonomy: (probeId: string) => void;
  onDeployRelay: () => void;
}

export const ProbesListPanel: React.FC<ProbesPanelProps> = ({
  probes,
  systems,
  blueprints,
  selectedProbeId,
  maxStatLevelOverrides,
  purchasedUnlocks,
  relays,
  onProbeSelect,
  onSystemSelect,
  onMine,
  onStopOperation,
  onReplicate,
  onRenameProbe,
  onScan,
  onResearch,
  onOpenDesigner,
  onDeleteBlueprint,
  onDeepSpaceLaunch,
  onUpgradeProbe,
  onSelfDestruct,
  onToggleAutonomy,
  onDeployRelay,
}) => {
  const selectedProbe = probes.find((p) => p.id === selectedProbeId);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState("");

  // UI View Mode (Status or Upgrade)
  const [viewMode, setViewMode] = useState<"status" | "upgrades">("status");

  // Deep Space UI State
  const [showDeepSpaceUI, setShowDeepSpaceUI] = useState(false);
  const [heading, setHeading] = useState(0);

  useEffect(() => {
    setIsEditing(false);
    setTempName("");
    setShowDeepSpaceUI(false);
    setHeading(selectedProbe?.heading ?? 0);
  }, [selectedProbeId, selectedProbe?.heading]);

  const startEditing = () => {
    if (selectedProbe) {
      setTempName(selectedProbe.name);
      setIsEditing(true);
    }
  };

  const saveName = () => {
    if (selectedProbe && tempName.trim()) {
      onRenameProbe(selectedProbe.id, tempName.trim());
      setIsEditing(false);
    }
  };

  const currentLocation =
    selectedProbe && selectedProbe.locationId
      ? systems.find((s) => s.id === selectedProbe.locationId)
      : null;

  const isAnalyzed = currentLocation?.analyzed || false;
  const canMineMetal =
    currentLocation && currentLocation.resourceYield.Metal > 0;
  const canMinePlutonium =
    currentLocation && currentLocation.resourceYield.Plutonium > 0;
  const canResearch =
    currentLocation && (currentLocation.scienceRemaining ?? 0) > 0;
  const existingRelayInSystem = currentLocation
    ? relays.find((r) => r.systemId === currentLocation.id)
    : null;
  const canDeployRelay =
    purchasedUnlocks.includes(SCIENCE_UNLOCK_IDS.RELAY_NETWORK) &&
    selectedProbe?.state === ProbeState.Idle &&
    !!selectedProbe?.locationId &&
    !existingRelayInSystem &&
    (selectedProbe?.inventory.Metal ?? 0) >= RELAY_DEPLOY_COST_METAL;

  // Calculate Turn Cost
  const turnCost = useMemo(() => {
    if (!selectedProbe || selectedProbe.state !== ProbeState.Exploring)
      return 0;
    const currentHeading = selectedProbe.heading || 0;
    let diff = Math.abs(heading - currentHeading);
    if (diff > 180) diff = 360 - diff;
    return Math.ceil(diff * TURN_COST_PER_DEGREE);
  }, [selectedProbe, heading]);

  const canAffordTurn = selectedProbe
    ? selectedProbe.inventory.Plutonium >= turnCost
    : false;
  const isSolarSailing =
    selectedProbe?.isSolarSailing ||
    (selectedProbe?.state === ProbeState.Exploring &&
      selectedProbe?.inventory.Plutonium <= 0);

  // Helper to render upgrade row
  const renderUpgradeRow = (
    statKey: keyof ProbeStats,
    label: string,
    icon: React.ReactNode
  ) => {
    if (!selectedProbe) return null;
    const currentVal = selectedProbe.stats[statKey];
    const config = UPGRADE_COSTS[statKey];
    // Use dynamic max level from unlocks, fallback to base max
    const maxLevel = maxStatLevelOverrides[statKey] ?? MAX_STAT_LEVELS[statKey];

    let levelFactor = currentVal;
    if (statKey === "scanRange") levelFactor = currentVal / config.increment;

    // Check if at max level
    const isAtMax = currentVal >= maxLevel;

    const metalCost = Math.floor(config.Metal * (levelFactor + 1));
    const plutoniumCost = Math.floor(config.Plutonium * (levelFactor + 1));

    const canAfford =
      selectedProbe.inventory.Metal >= metalCost &&
      selectedProbe.inventory.Plutonium >= plutoniumCost;

    // Hide autonomy upgrades at max level
    if (statKey === "autonomyLevel" && isAtMax) return null;

    return (
      <div className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between items-center group">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            {icon} {config.name}
          </div>
          <div className="text-[10px] text-slate-500">
            Lvl {levelFactor} →{" "}
            {isAtMax ? (
              <span className="text-amber-400 font-bold">MAX</span>
            ) : (
              <span className="text-cyan-400">Lvl {levelFactor + 1}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => onUpgradeProbe(selectedProbe.id, statKey)}
          disabled={
            isAtMax || !canAfford || selectedProbe.state !== ProbeState.Idle
          }
          className={`px-2 py-1.5 rounded text-[10px] font-bold border transition-colors flex flex-col items-end min-w-[80px] ${
            isAtMax
              ? "bg-amber-900/20 border-amber-800/50 text-amber-600 cursor-not-allowed"
              : canAfford && selectedProbe.state === ProbeState.Idle
              ? "bg-emerald-900/30 border-emerald-800 hover:bg-emerald-900/50 text-emerald-300 cursor-pointer"
              : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
          }`}
        >
          <span>{isAtMax ? "MAX" : "UPGRADE"}</span>
          <div className="flex gap-1 text-[9px] opacity-80">
            <span>M:{metalCost}</span>
            <span>P:{plutoniumCost}</span>
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden w-full">
      <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center flex-none">
        <h2 className="text-cyan-400 font-bold text-sm flex items-center gap-2">
          <Satellite size={16} /> PROBE NETWORK
        </h2>
        <span className="text-xs text-slate-500">{probes.length} Units</span>
      </div>

      {/* Section 1: Probes List (1/3 Height) */}
      <div className="h-1/3 flex-none overflow-y-auto p-2 space-y-1 min-h-0 border-b border-slate-800">
        {probes.map((probe) => (
          <button
            key={probe.id}
            onClick={() => onProbeSelect(probe.id)}
            className={`w-full text-left p-2 rounded flex items-center justify-between group transition-colors ${
              selectedProbeId === probe.id
                ? "bg-cyan-900/30 border border-cyan-700/50"
                : "bg-slate-800/50 border border-transparent hover:bg-slate-800 hover:border-slate-700"
            }`}
          >
            <div>
              <div
                className={`font-mono text-xs font-bold ${
                  selectedProbeId === probe.id
                    ? "text-cyan-200"
                    : "text-slate-400"
                }`}
              >
                {probe.name}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                {probe.state === ProbeState.MiningMetal ||
                probe.state === ProbeState.MiningPlutonium ? (
                  probe.state === ProbeState.MiningMetal ? (
                    <Pickaxe size={10} className="text-yellow-400" />
                  ) : (
                    <Radiation size={10} className="text-teal-400" />
                  )
                ) : probe.state === ProbeState.Traveling ? (
                  <Rocket size={10} />
                ) : probe.state === ProbeState.Scanning ? (
                  <Radar size={10} className="text-indigo-400" />
                ) : probe.state === ProbeState.Exploring ? (
                  <Compass size={10} className="text-emerald-400" />
                ) : probe.state === ProbeState.Replicating ? (
                  <Hammer size={10} />
                ) : (
                  <Zap size={10} />
                )}
                {probe.state}
                {probe.stats.autonomyLevel > 0 && (
                  <span
                    className={`ml-1 font-bold ${
                      probe.isAutonomyEnabled
                        ? "text-purple-400"
                        : "text-slate-600"
                    }`}
                  >
                    AI
                  </span>
                )}
              </div>
            </div>
            {probe.locationId && (
              <div className="text-[10px] text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded">
                {systems.find((s) => s.id === probe.locationId)?.name ||
                  "Deep Space"}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Section 2: Selected Probe Details (Takes remaining space) */}
      {selectedProbe && (
        <div className="flex-1 p-3 bg-slate-950/50 overflow-y-auto min-h-0 flex flex-col">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2 flex-none">
            <Zap size={12} /> Selected Unit
          </h3>

          {/* Header Info */}
          <div className="flex justify-between items-start mb-3 flex-none">
            <div className="flex-1 mr-2">
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="bg-slate-900 text-slate-200 text-sm border border-slate-700 rounded px-1 py-0.5 w-full focus:outline-none focus:border-cyan-500"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                  />
                  <button
                    onClick={saveName}
                    className="p-1 hover:bg-emerald-900/50 text-emerald-400 rounded"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-1 hover:bg-red-900/50 text-red-400 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <div className="text-sm font-bold text-slate-200">
                    {selectedProbe.name}
                  </div>
                  <button
                    onClick={startEditing}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-cyan-400 transition-opacity"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
              <div className="text-xs text-slate-500">
                {selectedProbe.model}
              </div>
            </div>
            {selectedProbe.locationId && (
              <button
                onClick={() => onSystemSelect(selectedProbe.locationId!)}
                className="text-[10px] flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 px-2 py-1 rounded transition-colors flex-none"
              >
                <MapPin size={10} /> Go to Loc
              </button>
            )}
          </div>

          {/* View Toggle Tabs */}
          <div className="flex rounded bg-slate-900 p-0.5 mb-3 flex-none">
            <button
              onClick={() => setViewMode("status")}
              className={`flex-1 text-[10px] font-bold py-1 rounded transition-colors ${
                viewMode === "status"
                  ? "bg-slate-700 text-cyan-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              STATUS
            </button>
            <button
              onClick={() => setViewMode("upgrades")}
              className={`flex-1 text-[10px] font-bold py-1 rounded transition-colors ${
                viewMode === "upgrades"
                  ? "bg-slate-700 text-emerald-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              UPGRADE BAY
            </button>
          </div>

          {/* STATUS VIEW */}
          {viewMode === "status" && (
            <div className="space-y-3">
              {/* Resources */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">METAL</div>
                  <div className="text-yellow-400 font-mono text-sm">
                    {Math.floor(selectedProbe.inventory.Metal)}
                  </div>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500">PLUTONIUM</div>
                  <div
                    className={`text-sm font-mono ${
                      selectedProbe.inventory.Plutonium < 20
                        ? "text-teal-400"
                        : "text-teal-400"
                    }`}
                  >
                    {Math.floor(selectedProbe.inventory.Plutonium)}
                  </div>
                </div>
              </div>

              {/* AI Status */}
              {selectedProbe.stats.autonomyLevel > 0 && (
                <div className="bg-purple-900/20 px-2 py-1.5 rounded border border-purple-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit size={12} className="text-purple-400" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-purple-300">
                        {selectedProbe.stats.autonomyLevel === 1
                          ? "ADVENTURER AI"
                          : "REPLICATOR AI"}
                      </span>
                      <span className="text-[9px] text-purple-400/70">
                        Autonomous Logic Installed
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleAutonomy(selectedProbe.id)}
                    className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 border ${
                      selectedProbe.isAutonomyEnabled
                        ? "bg-purple-800 text-white border-purple-600 hover:bg-purple-700"
                        : "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700"
                    }`}
                    title="Toggle Autonomous Behavior"
                  >
                    <Power size={10} />{" "}
                    {selectedProbe.isAutonomyEnabled ? "ON" : "OFF"}
                  </button>
                </div>
              )}

              {/* Performance Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="bg-slate-900 px-2 py-1.5 rounded border border-slate-800 flex justify-between items-center"
                  title="Mining Speed Multiplier"
                >
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Pickaxe size={10} className="text-yellow-400" /> MINING
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    {selectedProbe.stats.miningSpeed}x
                  </span>
                </div>
                <div
                  className="bg-slate-900 px-2 py-1.5 rounded border border-slate-800 flex justify-between items-center"
                  title="Engine Thrust Multiplier"
                >
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Rocket size={10} className="text-teal-400" /> THRUST
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    {selectedProbe.stats.flightSpeed}x
                  </span>
                </div>
              </div>

              {/* Sensor Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="bg-slate-900 px-2 py-1.5 rounded border border-slate-800 flex justify-between items-center"
                  title="Sensor Range (Light Years)"
                >
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Radar size={10} className="text-indigo-400" /> RANGE
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    {selectedProbe.stats.scanRange} LY
                  </span>
                </div>
                <div
                  className="bg-slate-900 px-2 py-1.5 rounded border border-slate-800 flex justify-between items-center"
                  title="Scan Speed Multiplier"
                >
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Activity size={10} className="text-indigo-400" /> SCAN SPD
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    {selectedProbe.stats.scanSpeed}x
                  </span>
                </div>
              </div>

              {/* Progress Bars and Actions (Existing Code) */}
              {selectedProbe.state === ProbeState.Exploring && (
                <div className="mt-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                    <Compass size={10} /> Heading:{" "}
                    {selectedProbe.heading?.toFixed(0)}°
                  </div>
                  {isSolarSailing && (
                    <div className="flex items-center gap-2 text-[10px] text-amber-400 animate-pulse">
                      <Wind size={10} /> SOLAR SAILING (5% PWR)
                    </div>
                  )}
                </div>
              )}
              {selectedProbe.state === ProbeState.Traveling &&
                isSolarSailing && (
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-amber-400 animate-pulse">
                    <Wind size={10} /> SOLAR SAILING (5% PWR)
                  </div>
                )}
              {selectedProbe.progress > 0 &&
                selectedProbe.state !== ProbeState.MiningMetal &&
                selectedProbe.state !== ProbeState.MiningPlutonium &&
                selectedProbe.state !== ProbeState.Exploring && (
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        selectedProbe.state === ProbeState.Scanning
                          ? "bg-indigo-500"
                          : "bg-cyan-500"
                      }`}
                      style={{ width: `${selectedProbe.progress}%` }}
                    />
                  </div>
                )}
              {(selectedProbe.state === ProbeState.MiningMetal ||
                selectedProbe.state === ProbeState.MiningPlutonium) && (
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      selectedProbe.state === ProbeState.MiningPlutonium
                        ? "bg-teal-500"
                        : "bg-yellow-500"
                    }`}
                    style={{ width: `${selectedProbe.progress}%` }}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[10px] text-slate-600 font-bold mb-2">
                  PROBE ACTIONS
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {/* Main Operation Buttons */}
                  {!showDeepSpaceUI ? (
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => onMine(ResourceType.Metal)}
                        disabled={
                          selectedProbe.state !== ProbeState.Idle ||
                          !selectedProbe.locationId ||
                          !canMineMetal ||
                          !isAnalyzed
                        }
                        className="flex flex-col items-center justify-center p-2 gap-1 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-200 rounded text-[10px] font-bold border border-yellow-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={
                          !isAnalyzed
                            ? "Analysis required to identify resources"
                            : !canMineMetal
                            ? "System depleted of Metal"
                            : ""
                        }
                      >
                        <Pickaxe size={14} /> MINE M.
                      </button>
                      <button
                        onClick={() => onMine(ResourceType.Plutonium)}
                        disabled={
                          selectedProbe.state !== ProbeState.Idle ||
                          !selectedProbe.locationId ||
                          !canMinePlutonium ||
                          !isAnalyzed
                        }
                        className="flex flex-col items-center justify-center p-2 gap-1 bg-teal-900/30 hover:bg-teal-900/50 text-teal-200 rounded text-[10px] font-bold border border-teal-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={
                          !isAnalyzed
                            ? "Analysis required to identify resources"
                            : !canMinePlutonium
                            ? "System depleted of Plutonium"
                            : ""
                        }
                      >
                        <Radiation size={14} /> MINE P.
                      </button>
                      <button
                        onClick={onScan}
                        disabled={selectedProbe.state !== ProbeState.Idle}
                        className="flex flex-col items-center justify-center p-2 gap-1 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 rounded text-[10px] font-bold border border-indigo-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Radar size={14} /> SCAN
                      </button>
                    </div>
                  ) : (
                    /* Deep Space Launch UI */
                    <div className="bg-slate-900 p-2 rounded border border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-[10px] font-bold text-emerald-400">
                          VECTOR CONFIGURATION
                        </h4>
                        <button
                          onClick={() => setShowDeepSpaceUI(false)}
                          className="text-slate-500 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative w-8 h-8 rounded-full border border-slate-600 flex items-center justify-center bg-slate-800">
                          <Navigation
                            size={12}
                            className="text-emerald-400 transition-transform"
                            style={{ transform: `rotate(${heading + 45}deg)` }}
                          />
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="359"
                          value={heading}
                          onChange={(e) => setHeading(Number(e.target.value))}
                          className="flex-1 accent-emerald-500 h-1 bg-slate-700 rounded-lg appearance-none"
                        />
                        <div className="w-8 text-right font-mono text-xs text-emerald-300">
                          {heading}°
                        </div>
                      </div>

                      {/* Turn Cost Preview */}
                      {turnCost > 0 && (
                        <div className="text-[10px] text-amber-400 mb-2 flex items-center gap-1">
                          <AlertCircle size={10} /> Maneuver Cost: {turnCost} Pu
                        </div>
                      )}

                      <button
                        onClick={() => onDeepSpaceLaunch(heading)}
                        disabled={false} // Always allowed, but might deplete fuel
                        className={`w-full text-white text-xs font-bold py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                          selectedProbe.state === ProbeState.Exploring &&
                          !canAffordTurn
                            ? "bg-amber-800 hover:bg-amber-700 border border-amber-600"
                            : selectedProbe.state === ProbeState.Idle &&
                              selectedProbe.inventory.Plutonium <= 0
                            ? "bg-amber-700 hover:bg-amber-600"
                            : "bg-emerald-700 hover:bg-emerald-600"
                        }`}
                      >
                        {selectedProbe.state === ProbeState.Exploring
                          ? canAffordTurn
                            ? "ADJUST COURSE"
                            : "EMERGENCY TURN (DRAIN FUEL)"
                          : selectedProbe.inventory.Plutonium > 0
                          ? "ENGAGE THRUSTERS"
                          : "ENGAGE SOLAR SAILS (SLOW)"}
                      </button>
                    </div>
                  )}

                  {/* Extra Actions Row */}
                  {!showDeepSpaceUI && (
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => setShowDeepSpaceUI(true)}
                        disabled={
                          selectedProbe.state !== ProbeState.Idle &&
                          selectedProbe.state !== ProbeState.Exploring
                        }
                        className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 py-1.5 rounded text-[10px] font-bold border border-slate-700 transition-colors disabled:opacity-30"
                      >
                        <Compass size={12} />{" "}
                        {selectedProbe.state === ProbeState.Exploring
                          ? "ADJUST COURSE"
                          : "DEEP SPACE"}
                      </button>
                      <button
                        onClick={onResearch}
                        disabled={
                          selectedProbe.state !== ProbeState.Idle ||
                          !selectedProbe.locationId ||
                          !canResearch
                        }
                        className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 py-1.5 rounded text-[10px] font-bold border border-slate-700 transition-colors disabled:opacity-30"
                        title={
                          !canResearch
                            ? "No research remaining in this system"
                            : ""
                        }
                      >
                        <Activity size={12} /> RESEARCH
                      </button>
                      <button
                        onClick={onDeployRelay}
                        disabled={!canDeployRelay}
                        className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-purple-300 py-1.5 rounded text-[10px] font-bold border border-slate-700 transition-colors disabled:opacity-30"
                        title={
                          !purchasedUnlocks.includes(
                            SCIENCE_UNLOCK_IDS.RELAY_NETWORK
                          )
                            ? "Unlock required: Quantum Relay Network"
                            : !selectedProbe?.locationId
                            ? "Must be docked at a system"
                            : selectedProbe?.state !== ProbeState.Idle
                            ? "Probe must be Idle"
                            : existingRelayInSystem
                            ? "Relay already deployed in this system"
                            : (selectedProbe?.inventory.Metal ?? 0) <
                              RELAY_DEPLOY_COST_METAL
                            ? `Requires ${RELAY_DEPLOY_COST_METAL} Metal`
                            : ""
                        }
                      >
                        <Satellite size={12} /> DEPLOY RELAY (
                        {RELAY_DEPLOY_COST_METAL}M)
                      </button>
                    </div>
                  )}

                  {/* Stop Button (Contextual) */}
                  {selectedProbe.state !== ProbeState.Idle &&
                    selectedProbe.state !== ProbeState.Traveling &&
                    selectedProbe.state !== ProbeState.Exploring && (
                      <button
                        onClick={onStopOperation}
                        className="flex items-center justify-center gap-2 bg-amber-900/50 hover:bg-amber-900 text-amber-200 py-1.5 rounded text-xs font-bold border border-amber-800 transition-colors"
                      >
                        <Pause size={12} /> HALT OPERATIONS
                      </button>
                    )}

                  {/* Self Destruct */}
                  <button
                    onClick={() => onSelfDestruct(selectedProbe.id)}
                    className="flex items-center justify-center gap-2 bg-red-950/50 hover:bg-red-900 text-red-400 py-1.5 rounded text-xs font-bold border border-red-900 transition-colors mt-2"
                  >
                    <Skull size={12} /> SELF DESTRUCT
                  </button>

                  {/* Replicate Control */}
                  <div className="mt-1">
                    <div className="flex justify-between items-end mb-1">
                      <div className="text-[10px] text-slate-600 font-bold">
                        CREATE NEW PROBE
                      </div>
                      <button
                        onClick={() => onOpenDesigner()}
                        disabled={selectedProbe.state !== ProbeState.Idle}
                        className="text-[10px] flex items-center gap-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                      >
                        <Plus size={10} /> Design New
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {blueprints.map((bp) => {
                        const cost = bp.cost;
                        const canAfford =
                          selectedProbe.inventory.Metal >= cost.Metal &&
                          selectedProbe.inventory.Plutonium >= cost.Plutonium;
                        const effectiveTime = Math.ceil(
                          cost.time /
                            selectedProbe.stats.replicationSpeed /
                            1000
                        );

                        return (
                          <button
                            key={bp.id}
                            onClick={() => onReplicate(bp)}
                            disabled={
                              selectedProbe.state !== ProbeState.Idle ||
                              !canAfford
                            }
                            className={`relative text-[10px] p-1.5 rounded border text-left transition-all group/bp ${
                              canAfford &&
                              selectedProbe.state === ProbeState.Idle
                                ? "bg-slate-800 border-slate-700 hover:border-cyan-500 text-slate-300"
                                : "bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed"
                            }`}
                          >
                            <div className="font-bold truncate pr-3">
                              {bp.name}
                            </div>
                            <div className="opacity-60 flex justify-between items-center">
                              <span>
                                M:{cost.Metal} P:{cost.Plutonium}
                              </span>
                              <span className="text-[9px] flex items-center gap-0.5">
                                <Clock size={9} /> {effectiveTime}s
                              </span>
                            </div>
                            {bp.isCustom && (
                              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/bp:opacity-100">
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenDesigner(bp);
                                  }}
                                  className="hover:text-cyan-400 p-0.5"
                                >
                                  <Pencil size={10} />
                                </div>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteBlueprint(bp.id);
                                  }}
                                  className="hover:text-red-400 p-0.5"
                                >
                                  <Trash2 size={10} />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* UPGRADE VIEW */}
          {viewMode === "upgrades" && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <div className="text-[10px] text-slate-500 mb-2 italic bg-slate-900/50 p-2 rounded">
                Consume local resources to enhance probe capabilities. Probe
                must be Idle.
              </div>

              {/* Resource Wallet (Duplicate for visibility) */}
              <div className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800 mb-2">
                <div className="text-xs text-slate-300 font-mono">
                  M: {Math.floor(selectedProbe.inventory.Metal)}
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  P: {Math.floor(selectedProbe.inventory.Plutonium)}
                </div>
              </div>

              {renderUpgradeRow(
                "miningSpeed",
                "Mining Speed",
                <Pickaxe size={12} className="text-yellow-400" />
              )}
              {renderUpgradeRow(
                "flightSpeed",
                "Flight Speed",
                <Rocket size={12} className="text-teal-400" />
              )}
              {renderUpgradeRow(
                "scanRange",
                "Scan Range",
                <Radar size={12} className="text-indigo-400" />
              )}
              {renderUpgradeRow(
                "scanSpeed",
                "Scan Processing",
                <Activity size={12} className="text-blue-400" />
              )}
              {renderUpgradeRow(
                "replicationSpeed",
                "Fabrication",
                <Hammer size={12} className="text-emerald-400" />
              )}
              {renderUpgradeRow(
                "autonomyLevel",
                "Neural Core",
                <BrainCircuit size={12} className="text-purple-400" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
