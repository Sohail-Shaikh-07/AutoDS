import React, { useEffect, useRef } from "react";
import { Terminal, Activity, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";

interface Log {
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "system";
}

interface StatusTerminalProps {
  logs: Log[];
  status: string;
  onNewSession: () => void;
}

export const StatusTerminal: React.FC<StatusTerminalProps> = ({
  logs,
  status,
  onNewSession,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col bg-black border-l border-white/10 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-accent">
          <Terminal size={14} />
          <span className="font-semibold uppercase tracking-wider">
            System Status
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* New Session Button */}
          <button
            onClick={onNewSession}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
            title="Start New Session"
          >
            <RefreshCw size={12} />
            New Session
          </button>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={clsx(
                  "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                  status === "DISCONNECTED" ? "bg-red-500" : "bg-green-500",
                )}
              ></span>
              <span
                className={clsx(
                  "relative inline-flex rounded-full h-2 w-2",
                  status === "DISCONNECTED" ? "bg-red-500" : "bg-green-500",
                )}
              ></span>
            </span>
            <span className="text-muted text-[10px]">
              {status === "DISCONNECTED" ? "OFFLINE" : "ONLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Active Status Banner */}
      <div className="bg-surface/30 px-4 py-2 border-b border-white/5 flex items-center gap-3">
        <Activity size={14} className="text-primary animate-pulse" />
        <span className="text-primary font-medium tracking-wide">
          {status || "IDLE"}
        </span>
      </div>

      {/* Terminal Output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-black/50"
      >
        {logs.map((log, i) => (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={i}
            className="flex gap-3 text-gray-300"
          >
            <span className="text-white/30 shrink-0 select-none">
              {log.timestamp}
            </span>
            <span
              className={clsx(
                "break-all",
                log.type === "error" && "text-red-400",
                log.type === "success" && "text-green-400",
                log.type === "warning" && "text-yellow-400",
                log.type === "system" && "text-blue-400 font-bold",
              )}
            >
              {log.type === "system" && "> "}
              {log.message}
            </span>
          </motion.div>
        ))}
        <div className="h-4" /> {/* Spacer */}
      </div>
    </div>
  );
};
