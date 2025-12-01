import React from "react";
import { Relay, SolarSystem } from "../../types";
import { Radio, Trash2, MapPin } from "lucide-react";

export interface RelaysPanelProps {
  relays: Relay[];
  systems: SolarSystem[];
  onSystemSelect: (id: string) => void;
  onRemoveRelay: (relayId: string) => void;
}

export const RelaysListPanel: React.FC<RelaysPanelProps> = ({
  relays,
  systems,
  onSystemSelect,
  onRemoveRelay,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden w-full">
      <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center flex-none">
        <h2 className="text-purple-400 font-bold text-sm flex items-center gap-2">
          <Radio size={16} /> RELAY NETWORK
        </h2>
        <span className="text-xs text-slate-500">{relays.length} Active</span>
      </div>

      {/* Relays List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {relays.length === 0 ? (
          <div className="text-center text-slate-600 text-xs mt-8 px-4">
            <Radio size={32} className="mx-auto mb-2 opacity-30" />
            <p>No relays deployed.</p>
            <p className="mt-1 text-[10px] opacity-70">
              Deploy relays from idle probes to establish network
              infrastructure.
            </p>
          </div>
        ) : (
          relays.map((relay) => {
            const system = systems.find((s) => s.id === relay.systemId);
            const systemName = system?.name || "Unknown System";
            const deployedDate = new Date(relay.deployedAt).toLocaleString();

            return (
              <div
                key={relay.id}
                className="bg-slate-800/50 border border-slate-700 rounded p-2 hover:bg-slate-800 transition-colors group"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <div className="font-mono text-xs font-bold text-purple-300">
                      {relay.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <MapPin size={10} className="text-purple-400" />
                      {systemName}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => system && onSystemSelect(system.id)}
                      className="p-1 hover:bg-slate-700 text-cyan-400 rounded"
                      title="Go to System"
                    >
                      <MapPin size={12} />
                    </button>
                    <button
                      onClick={() => onRemoveRelay(relay.id)}
                      className="p-1 hover:bg-red-900/50 text-red-400 rounded"
                      title="Remove Relay"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="text-[9px] text-slate-600 mt-1">
                  Deployed: {deployedDate}
                </div>
                <div className="mt-1 flex gap-2">
                  <div className="bg-slate-900 px-2 py-0.5 rounded text-[9px] text-purple-400 border border-purple-900/50">
                    Position: {Math.floor(relay.position.x)},{" "}
                    {Math.floor(relay.position.y)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
