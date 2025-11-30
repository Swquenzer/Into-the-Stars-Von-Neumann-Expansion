import React from "react";
import { Probe, SolarSystem, ProbeState } from "../../types";
import {
  Activity,
  Rocket,
  Pickaxe,
  Radiation,
  Hammer,
  Radar,
  Compass,
  Wind,
} from "lucide-react";

export interface OperationsPanelProps {
  probes: Probe[];
  systems: SolarSystem[];
  onProbeSelect: (id: string) => void;
}

export const OperationsListPanel: React.FC<OperationsPanelProps> = ({
  probes,
  systems,
  onProbeSelect,
}) => {
  const activeProbes = probes.filter((p) => p.state !== ProbeState.Idle);

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden w-full">
      <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center flex-none">
        <h2 className="text-emerald-400 font-bold text-sm flex items-center gap-2">
          <Activity size={16} /> CURRENT OPERATIONS
        </h2>
        <span className="text-xs text-slate-500">
          {activeProbes.length} Active
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {activeProbes.length === 0 && (
          <div className="text-slate-600 text-xs italic text-center mt-4">
            No active operations
          </div>
        )}
        {activeProbes.map((probe) => {
          let details = "";
          let targetName = "";
          let progressColor = "bg-cyan-500";
          let OperationIcon = Activity;

          if (probe.state === ProbeState.Traveling && probe.targetSystemId) {
            targetName =
              systems.find((s) => s.id === probe.targetSystemId)?.name ||
              "Unknown";
            details = probe.isSolarSailing
              ? ` solar sailing to ${targetName}`
              : ` traveling to ${targetName}`;
            progressColor = probe.isSolarSailing
              ? "bg-amber-500"
              : "bg-red-500";
            OperationIcon = probe.isSolarSailing ? Wind : Rocket;
          } else if (
            probe.state === ProbeState.MiningMetal &&
            probe.locationId
          ) {
            const locName =
              systems.find((s) => s.id === probe.locationId)?.name || "Unknown";
            details = ` mining Metal at ${locName}`;
            if (probe.stats.autonomyLevel > 0) details = " (Auto) " + details;
            progressColor = "bg-slate-300";
            OperationIcon = Pickaxe;
          } else if (
            probe.state === ProbeState.MiningPlutonium &&
            probe.locationId
          ) {
            const locName =
              systems.find((s) => s.id === probe.locationId)?.name || "Unknown";
            details = ` mining Plutonium at ${locName}`;
            if (probe.stats.autonomyLevel > 0) details = " (Auto) " + details;
            progressColor = "bg-red-500";
            OperationIcon = Radiation;
          } else if (probe.state === ProbeState.Replicating) {
            let timeString = "";
            if (probe.pendingBlueprint) {
              const totalTimeMs =
                probe.pendingBlueprint.cost.time /
                Math.max(0.1, probe.stats.replicationSpeed);
              const remainingMs = totalTimeMs * (1 - probe.progress / 100);
              const remainingSec = Math.ceil(remainingMs / 1000);
              timeString = ` (${remainingSec}s)`;
            }
            details = ` replicating...${timeString}`;
            if (probe.stats.autonomyLevel > 0) details = " (Auto) " + details;
            progressColor = "bg-blue-500";
            OperationIcon = Hammer;
          } else if (probe.state === ProbeState.Scanning) {
            details = " scanning sector...";
            if (probe.stats.autonomyLevel > 0) details = " (Auto) " + details;
            progressColor = "bg-indigo-500";
            OperationIcon = Radar;
          } else if (probe.state === ProbeState.Exploring) {
            const sailing = probe.inventory.Plutonium <= 0;
            details = sailing
              ? ` drifting (Head: ${probe.heading?.toFixed(0)}°)`
              : ` exploring (Head: ${probe.heading?.toFixed(0)}°)`;
            if (probe.stats.autonomyLevel > 0) details = " (Auto) " + details;
            progressColor = sailing ? "bg-amber-500" : "bg-emerald-500";
            OperationIcon = sailing ? Wind : Compass;
          }

          const displayPct =
            probe.state === ProbeState.Traveling
              ? Math.floor(probe.progress * 100)
              : Math.floor(probe.progress);

          return (
            <button
              key={probe.id}
              onClick={() => onProbeSelect(probe.id)}
              className="w-full bg-slate-800/50 border border-slate-700 p-2 rounded hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-bold text-xs text-slate-300">
                  {probe.name}
                </div>
                <div className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                  <OperationIcon size={10} /> {probe.state}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mb-1">{details}</div>
              {/* No transitions on this progress bar */}
              {probe.state !== ProbeState.Exploring ? (
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`${progressColor} h-full`}
                    style={{ width: `${displayPct}%` }}
                  />
                </div>
              ) : (
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
                  {/* Pulse bar for exploring */}
                  <div
                    className={`h-full w-full ${
                      probe.inventory.Plutonium <= 0
                        ? "bg-amber-500/20"
                        : "bg-emerald-500/20"
                    } animate-pulse`}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
