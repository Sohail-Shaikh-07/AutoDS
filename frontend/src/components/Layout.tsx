import React from "react";
import type { ReactNode } from "react";

interface LayoutProps {
  leftPanel: ReactNode;
  centerPanel: ReactNode;
  rightPanel: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
}) => {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-white">
      {/* Left Panel: Explorer (20%) */}
      <div className="w-[20%] min-w-[250px] border-r border-white/10 flex flex-col bg-surface/30">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <span className="font-bold text-xs text-white">DS</span>
          </div>
          <span className="font-bold tracking-tight">AutoDS Workspace</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wider">
            Explorer
          </div>
          {leftPanel}
        </div>
      </div>

      {/* Center Panel: Chat (60%) */}
      <div className="flex-1 flex flex-col min-w-[400px] relative z-0">
        {centerPanel}
      </div>

      {/* Right Panel: Status (20%) */}
      <div className="w-[25%] min-w-[300px] border-l border-white/10 flex flex-col bg-surface/30">
        {rightPanel}
      </div>
    </div>
  );
};
