import React, { useState, useEffect } from "react";
import { ProbeBlueprint, ProbeStats } from "../types";
import { BASE_COST, COST_MULTIPLIERS } from "../constants";
import {
  X,
  Save,
  Cpu,
  Zap,
  Activity,
  Radar,
  Rocket,
  BrainCircuit,
} from "lucide-react";

interface ProbeDesignerProps {
  initialBlueprint?: ProbeBlueprint;
  onClose: () => void;
  onSave: (blueprint: ProbeBlueprint) => void;
}

export const ProbeDesigner: React.FC<ProbeDesignerProps> = ({
  initialBlueprint,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(initialBlueprint?.name || "New Design");
  const [stats, setStats] = useState<ProbeStats>(
    initialBlueprint?.stats || {
      miningSpeed: 0,
      flightSpeed: 1, // Default to 1
      replicationSpeed: 0,
      scanRange: 0,
      scanSpeed: 1, // Default to 1
      autonomyLevel: 0,
    }
  );

  const [cost, setCost] = useState({ Metal: 0, Plutonium: 0, time: 0 });

  // Calculate costs whenever stats change
  useEffect(() => {
    let metal = BASE_COST.Metal;
    let plutonium = BASE_COST.Plutonium;

    metal += stats.miningSpeed * COST_MULTIPLIERS.miningSpeed.Metal;
    plutonium += stats.miningSpeed * COST_MULTIPLIERS.miningSpeed.Plutonium;

    // Flight speed keeps standard cost per level (level 1 costs resources)
    metal += stats.flightSpeed * COST_MULTIPLIERS.flightSpeed.Metal;
    plutonium += stats.flightSpeed * COST_MULTIPLIERS.flightSpeed.Plutonium;

    metal += stats.replicationSpeed * COST_MULTIPLIERS.replicationSpeed.Metal;
    plutonium +=
      stats.replicationSpeed * COST_MULTIPLIERS.replicationSpeed.Plutonium;

    metal += stats.scanRange * COST_MULTIPLIERS.scanRange.Metal;
    plutonium += stats.scanRange * COST_MULTIPLIERS.scanRange.Plutonium;

    // Scan speed level 1 is free (subtract 1 from count for cost calc)
    const scanSpeedCostFactor = Math.max(0, stats.scanSpeed - 1);
    metal += scanSpeedCostFactor * COST_MULTIPLIERS.scanSpeed.Metal;
    plutonium += scanSpeedCostFactor * COST_MULTIPLIERS.scanSpeed.Plutonium;

    // Autonomy Costs
    metal += stats.autonomyLevel * COST_MULTIPLIERS.autonomyLevel.Metal;
    plutonium += stats.autonomyLevel * COST_MULTIPLIERS.autonomyLevel.Plutonium;

    const totalMass = metal + plutonium;
    const time = BASE_COST.Time + totalMass * COST_MULTIPLIERS.timeFactor;

    setCost({
      Metal: Math.floor(metal),
      Plutonium: Math.floor(plutonium),
      time: Math.floor(time),
    });
  }, [stats]);

  const handleSave = () => {
    if (!name.trim()) return;
    const newBlueprint: ProbeBlueprint = {
      id: initialBlueprint ? initialBlueprint.id : `bp-custom-${Date.now()}`,
      name: name.trim(),
      stats: { ...stats },
      cost: { ...cost },
      isCustom: true,
    };
    onSave(newBlueprint);
  };

  const updateStat = (key: keyof ProbeStats, value: number) => {
    setStats((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div className="flex items-center gap-3 w-full">
            <Cpu className="text-cyan-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent text-2xl font-bold text-slate-100 border-b border-slate-700 focus:border-cyan-500 focus:outline-none w-1/2"
              placeholder="Enter Blueprint Name"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
              Core Specifications
            </h3>

            <StatSlider
              label="Mining Systems"
              icon={<Zap size={16} className="text-yellow-400" />}
              value={stats.miningSpeed}
              max={10}
              onChange={(v) => updateStat("miningSpeed", v)}
              desc="Increases resource extraction rate."
            />

            <StatSlider
              label="Propulsion Drive"
              icon={<Rocket size={16} className="text-red-400" />}
              value={stats.flightSpeed}
              max={10}
              onChange={(v) => updateStat("flightSpeed", v)}
              desc="Increases travel speed between systems."
            />

            <StatSlider
              label="Replication Fabricator"
              icon={<Activity size={16} className="text-emerald-400" />}
              value={stats.replicationSpeed}
              max={5}
              onChange={(v) => updateStat("replicationSpeed", v)}
              desc="Reduces time required to build new probes."
            />

            <div className="pt-4 border-t border-slate-800 space-y-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                Sensors & AI
              </h3>

              <StatSlider
                label="Sensor Array Range"
                icon={<Radar size={16} className="text-indigo-400" />}
                value={stats.scanRange}
                max={1000}
                step={50}
                onChange={(v) => updateStat("scanRange", v)}
                desc="Range in Light Years to detect hidden systems."
                unit=" LY"
              />

              <StatSlider
                label="Sensor Processing"
                icon={<Cpu size={16} className="text-blue-400" />}
                value={stats.scanSpeed}
                max={10}
                onChange={(v) => updateStat("scanSpeed", v)}
                desc="Speed at which a sector scan is completed."
              />

              {/* AI Core Selector */}
              <div>
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                    <BrainCircuit size={16} className="text-purple-400" /> AI
                    Core System
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStat("autonomyLevel", 0)}
                    className={`flex-1 p-2 rounded border text-xs font-bold transition-all ${
                      stats.autonomyLevel === 0
                        ? "bg-purple-900/50 border-purple-500 text-purple-200"
                        : "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700"
                    }`}
                  >
                    Manual
                  </button>
                  <button
                    onClick={() => updateStat("autonomyLevel", 1)}
                    className={`flex-1 p-2 rounded border text-xs font-bold transition-all ${
                      stats.autonomyLevel === 1
                        ? "bg-purple-900/50 border-purple-500 text-purple-200"
                        : "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700"
                    }`}
                  >
                    Adventurer
                  </button>
                  <button
                    onClick={() => updateStat("autonomyLevel", 2)}
                    className={`flex-1 p-2 rounded border text-xs font-bold transition-all ${
                      stats.autonomyLevel === 2
                        ? "bg-purple-900/50 border-purple-500 text-purple-200"
                        : "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700"
                    }`}
                  >
                    Replicator
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 h-8">
                  {stats.autonomyLevel === 0 &&
                    "Probe requires direct manual control for all operations."}
                  {stats.autonomyLevel === 1 &&
                    "Autonomous exploration and scanning. Will mine fuel as needed."}
                  {stats.autonomyLevel === 2 &&
                    "Full autonomy. Will explore, mine resources, and replicate itself automatically."}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-slate-950 rounded-xl p-6 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">
                Blueprint Analysis
              </h3>

              <div className="space-y-4">
                <CostRow
                  label="Metal Cost"
                  value={cost.Metal}
                  color="text-yellow-400"
                />
                <CostRow
                  label="Plutonium Cost"
                  value={cost.Plutonium}
                  color="text-teal-400"
                />
                <div className="h-px bg-slate-800 my-4" />
                <CostRow
                  label="Fabrication Time"
                  value={`${(cost.time / 1000).toFixed(1)}s`}
                  color="text-cyan-400"
                />
              </div>
            </div>

            <div className="mt-8 bg-slate-900 p-4 rounded text-xs text-slate-400 border border-slate-800">
              <p className="mb-2 font-bold text-slate-300">Design Notes:</p>
              <ul className="list-disc pl-4 space-y-1">
                {stats.flightSpeed > 7 && (
                  <li className="text-red-300">
                    High-thrust engines require significant plutonium.
                  </li>
                )}
                {stats.replicationSpeed > 3 && (
                  <li className="text-emerald-300">
                    Advanced fabrication modules drastically increase
                    complexity.
                  </li>
                )}
                {cost.Metal > 1000 && (
                  <li className="text-yellow-300">
                    Warning: High metal cost may exceed standard storage limits
                    of smaller probes.
                  </li>
                )}
                {stats.scanRange > 600 && (
                  <li className="text-indigo-300">
                    Long-range sensors enabled.
                  </li>
                )}
                {stats.scanSpeed === 1 && (
                  <li className="text-blue-300">
                    Basic sensor processing included at no extra cost.
                  </li>
                )}
                {stats.autonomyLevel > 0 && (
                  <li className="text-purple-300 font-bold">
                    Neural Net AI Core Installed. High resource cost.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={
              cost.Metal === BASE_COST.Metal &&
              cost.Plutonium === BASE_COST.Plutonium
            }
            className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />{" "}
            {initialBlueprint ? "Update Blueprint" : "Save Blueprint"}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatSlider: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  desc: string;
  unit?: string;
}> = ({ label, icon, value, max, step = 1, onChange, desc, unit = "" }) => (
  <div>
    <div className="flex justify-between mb-1">
      <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
        {icon} {label}
      </div>
      <div className="text-cyan-400 font-mono font-bold">
        {value}
        {unit}
      </div>
    </div>
    <input
      type="range"
      min="0"
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
    />
    <div className="text-[10px] text-slate-500 mt-1">{desc}</div>
  </div>
);

const CostRow: React.FC<{
  label: string;
  value: string | number;
  color: string;
}> = ({ label, value, color }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-500 text-sm font-bold">{label}</span>
    <span className={`text-xl font-mono ${color}`}>{value}</span>
  </div>
);
