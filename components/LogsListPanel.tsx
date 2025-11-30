import React from 'react';
import { Terminal } from 'lucide-react';

export interface LogsPanelProps {
  logs: string[];
}

export const LogsListPanel: React.FC<LogsPanelProps> = ({ logs }) => (
   <div className="flex flex-col h-full bg-slate-950 font-mono text-xs overflow-hidden w-full">
      <div className="p-2 bg-slate-900 border-b border-slate-800 text-slate-500 font-bold flex items-center gap-2 flex-none">
         <Terminal size={14} /> MISSION LOGS
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
         {logs.slice().reverse().map((log, i) => (
          <div key={i} className="text-slate-400 border-l-2 border-slate-800 pl-2 py-1 leading-tight">
            <span className="text-slate-600 text-[10px] mr-2">T-{logs.length - i}</span>
            {log}
          </div>
        ))}
      </div>
   </div>
);