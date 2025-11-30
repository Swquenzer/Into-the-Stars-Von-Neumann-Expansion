import React, { useMemo } from "react";
import { Probe, SolarSystem, ProbeState } from "../../types";
import { FUEL_CONSUMPTION_RATE, TURN_COST_PER_DEGREE } from "../../constants";
import {
  Radio,
  AlertCircle,
  LocateFixed,
  BrainCircuit,
  Send,
  Wind,
  Compass,
} from "lucide-react";

// Shared Helper for Distance
const getDistance = (sys: SolarSystem, probe: Probe | undefined) => {
  if (!probe) return 0;
  return Math.sqrt(
    Math.pow(sys.position.x - probe.position.x, 2) +
      Math.pow(sys.position.y - probe.position.y, 2)
  );
};

export interface SystemsPanelProps {
  systems: SolarSystem[];
  probes: Probe[];
  selectedSystemId: string | null;
  selectedProbeId: string | null;
  onSystemSelect: (id: string) => void;
  onProbeSelect: (id: string) => void;
  onAnalyze: (id: string) => void;
  onLaunch: (id: string) => void;
  onDeepSpaceLaunch: (heading: number) => void;
}

export const SystemsListPanel: React.FC<SystemsPanelProps> = ({
  systems,
  probes,
  selectedSystemId,
  selectedProbeId,
  onSystemSelect,
  onProbeSelect,
  onAnalyze,
  onLaunch,
  onDeepSpaceLaunch,
}) => {
  const selectedSystem = systems.find((s) => s.id === selectedSystemId);
  const selectedProbe = probes.find((p) => p.id === selectedProbeId);

  const fuelCost =
    selectedProbe && selectedSystem
      ? Math.floor(
          getDistance(selectedSystem, selectedProbe) * FUEL_CONSUMPTION_RATE
        )
      : 0;
  const canAffordLaunch = selectedProbe
    ? selectedProbe.inventory.Plutonium >= fuelCost
    : false;

  const isProbePresent = selectedSystem
    ? probes.some(
        (p) =>
          p.locationId === selectedSystem.id && p.state !== ProbeState.Traveling
      )
    : false;

  // Calculate angle and cost to selected system for Deep Space
  const deepSpaceVector = useMemo(() => {
    if (
      !selectedProbe ||
      !selectedSystem ||
      selectedProbe.state !== ProbeState.Exploring
    )
      return null;

    const dx = selectedSystem.position.x - selectedProbe.position.x;
    const dy = selectedSystem.position.y - selectedProbe.position.y;
    const rad = Math.atan2(dy, dx);
    let angle = (rad * 180) / Math.PI;
    if (angle < 0) angle += 360; // Normalize 0-360

    const currentHeading = selectedProbe.heading || 0;
    let diff = Math.abs(angle - currentHeading);
    if (diff > 180) diff = 360 - diff;

    const cost = Math.ceil(diff * TURN_COST_PER_DEGREE);
    return { angle, cost };
  }, [selectedProbe, selectedSystem]);

  // Filter & Sort systems
  const visibleSystems = useMemo(() => {
    return systems
      .filter((s) => s.discovered || s.visited)
      .sort((a, b) => {
        const distA = getDistance(a, selectedProbe);
        const distB = getDistance(b, selectedProbe);
        return distA - distB;
      });
  }, [systems, selectedProbe]);

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden w-full">
      <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center flex-none">
        <h2 className="text-amber-400 font-bold text-sm flex items-center gap-2">
          <Radio size={16} /> SYSTEM DATA
        </h2>
        <span className="text-xs text-slate-500">
          {systems.filter((s) => s.visited || s.analyzed).length} /{" "}
          {systems.length}
        </span>
      </div>

      {/* Section 1: Systems List (1/3 Height) */}
      <div className="h-1/3 flex-none overflow-y-auto p-2 space-y-1 min-h-0 border-b border-slate-800">
        {visibleSystems.map((system) => {
          const dist = getDistance(system, selectedProbe);
          const isKnown = system.analyzed; // Only show resources if fully analyzed
          const isSelected = selectedSystemId === system.id;

          return (
            <button
              key={system.id}
              onClick={() => onSystemSelect(system.id)}
              className={`w-full text-left p-2 rounded flex items-center justify-between group transition-colors ${
                isSelected
                  ? "bg-amber-900/30 border border-amber-700/50"
                  : "bg-slate-800/50 border border-transparent hover:bg-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className={`font-mono text-xs font-bold truncate ${
                      isSelected ? "text-amber-200" : "text-slate-400"
                    }`}
                  >
                    {system.name}
                  </div>
                  {!isKnown && (
                    <AlertCircle size={10} className="text-red-500 flex-none" />
                  )}
                </div>

                {selectedProbe && (
                  <div className="text-[10px] text-slate-600">
                    {Math.floor(dist)} LY
                  </div>
                )}
              </div>

              {isKnown && (
                <div className="flex gap-1 flex-none ml-2">
                  <div className="w-1.5 h-6 bg-slate-800 rounded-sm overflow-hidden flex flex-col justify-end">
                    <div
                      className="bg-slate-400 w-full"
                      style={{ height: `${system.resources.Metal}%` }}
                      title="Metal"
                    />
                  </div>
                  <div className="w-1.5 h-6 bg-slate-800 rounded-sm overflow-hidden flex flex-col justify-end">
                    <div
                      className="bg-red-400 w-full"
                      style={{ height: `${system.resources.Plutonium}%` }}
                      title="Plutonium"
                    />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Section 2: Selected System Details (Takes remaining space) */}
      {selectedSystem && (
        <div className="flex-1 p-3 bg-slate-950/50 overflow-y-auto min-h-0">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
            <LocateFixed size={12} /> Target Analysis
          </h3>

          <div className="space-y-3">
            <div className="text-sm font-bold text-slate-200">
              {selectedSystem.name}
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              {selectedSystem.lore ? (
                <p className="text-slate-400 italic text-xs leading-relaxed">
                  "{selectedSystem.lore}"
                </p>
              ) : (
                <button
                  onClick={() => onAnalyze(selectedSystem.id)}
                  disabled={!isProbePresent}
                  className={`w-full flex items-center justify-center gap-2 text-xs py-1.5 rounded transition-colors ${
                    isProbePresent
                      ? "bg-slate-800 hover:bg-slate-700 text-cyan-400"
                      : "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed"
                  }`}
                >
                  <BrainCircuit size={12} />{" "}
                  {isProbePresent ? "Analyze Composition" : "Probe Required"}
                </button>
              )}
            </div>

            {/* Resource Detail */}
            {selectedSystem.analyzed ? (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>METAL ABUNDANCE</span>
                  <span>{selectedSystem.resources.Metal}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-slate-400 h-full"
                    style={{ width: `${selectedSystem.resources.Metal}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>PLUTONIUM ABUNDANCE</span>
                  <span>{selectedSystem.resources.Plutonium}%</span>
                </div>
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-red-400 h-full"
                    style={{ width: `${selectedSystem.resources.Plutonium}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-600 text-center italic border border-slate-800 border-dashed rounded p-1">
                Unknown Composition
              </div>
            )}

            {/* Docked Probes Sub-section */}
            <div>
              <div className="text-[10px] text-slate-600 font-bold mb-1">
                DOCKED PROBES
              </div>
              <div className="flex flex-wrap gap-1">
                {probes.filter((p) => p.locationId === selectedSystem.id)
                  .length > 0 ? (
                  probes
                    .filter((p) => p.locationId === selectedSystem.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onProbeSelect(p.id)}
                        className={`text-[10px] px-2 py-0.5 rounded border ${
                          selectedProbeId === p.id
                            ? "bg-cyan-900/50 border-cyan-700 text-cyan-300"
                            : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))
                ) : (
                  <span className="text-[10px] text-slate-700 italic">
                    None
                  </span>
                )}
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              {/* Standard Launch */}
              {selectedProbe &&
                selectedProbe.locationId !== selectedSystem.id &&
                selectedProbe.state !== ProbeState.Exploring && (
                  <button
                    onClick={() => onLaunch(selectedSystem.id)}
                    disabled={selectedProbe.state !== ProbeState.Idle}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      !canAffordLaunch
                        ? "bg-amber-900 hover:bg-amber-800 text-amber-100"
                        : "bg-indigo-900 hover:bg-indigo-800 text-indigo-100"
                    }`}
                  >
                    {selectedProbe.state !== ProbeState.Idle ? (
                      <Send size={12} />
                    ) : canAffordLaunch ? (
                      <Send size={12} />
                    ) : (
                      <Wind size={12} />
                    )}
                    {selectedProbe.state !== ProbeState.Idle
                      ? "PROBE BUSY"
                      : !canAffordLaunch
                      ? `SOLAR SAIL LAUNCH (SLOW)`
                      : `LAUNCH (${fuelCost} Pu)`}
                  </button>
                )}

              {/* Deep Space Launch Vector Set */}
              {deepSpaceVector &&
                selectedProbe &&
                selectedProbe.state === ProbeState.Exploring && (
                  <button
                    onClick={() => onDeepSpaceLaunch(deepSpaceVector.angle)}
                    disabled={false} // Always allowed, same logic as above
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedProbe.inventory.Plutonium < deepSpaceVector.cost
                        ? "bg-amber-900 hover:bg-amber-800 text-amber-100"
                        : "bg-emerald-900 hover:bg-emerald-800 text-emerald-100"
                    }`}
                  >
                    <Compass size={12} />
                    {selectedProbe.inventory.Plutonium < deepSpaceVector.cost
                      ? "EMERGENCY TURN (DRAIN)"
                      : `SET VECTOR TO TARGET (${deepSpaceVector.cost} Pu)`}
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
