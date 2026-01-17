import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';

export interface TerminalLog {
  id: string;
  type: 'info' | 'error' | 'success' | 'exec' | 'thought';
  message: string;
  timestamp: string;
}

interface ActivityTerminalProps {
  logs: TerminalLog[];
}

export const ActivityTerminal: React.FC<ActivityTerminalProps> = ({ logs }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'exec': return 'text-blue-400';
      case 'thought': return 'text-purple-400';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border-l border-slate-800 font-mono text-xs overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest font-bold text-[10px]">
          <TerminalIcon size={12} />
          <span>Realtime Activity Log</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
        </div>
      </div>

      {/* Logs View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        {logs.length === 0 && (
          <div className="text-slate-600 italic">Waiting for agent activity...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 animate-in fade-in slide-in-from-right-1 duration-300">
            <span className="text-slate-600 flex-shrink-0">[{log.timestamp}]</span>
            <span className={getLogColor(log.type)}>{log.message}</span>
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
