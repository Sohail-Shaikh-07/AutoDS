import React from 'react';
import { FileCode, Download, Database, FileJson } from 'lucide-react';

interface Asset {
  name: string;
  type: 'notebook' | 'dataset' | 'report';
  size?: string;
}

interface AssetExplorerProps {
  sessionId: string;
}

export const AssetExplorer: React.FC<AssetExplorerProps> = ({ sessionId }) => {
  // Static placeholders for now, we can link to backend later
  const assets: Asset[] = [
    { name: `analysis_${sessionId}.ipynb`, type: 'notebook', size: '12 KB' },
    { name: 'dataset_summary.json', type: 'report', size: '2 KB' }
  ];

  const handleDownload = (name: string) => {
    const url = `http://localhost:8000/api/v1/export/notebook/${sessionId}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-4 space-y-4">
      <div className="flex items-center gap-2 text-slate-400 uppercase tracking-widest font-bold text-[10px] mb-2">
        <Database size={12} />
        <span>Generated Assets</span>
      </div>

      <div className="space-y-2">
        {assets.map((asset, idx) => (
          <div key={idx} className="group flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="text-blue-400">
                {asset.type === 'notebook' ? <FileCode size={18} /> : <FileJson size={18} />}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-200 truncate max-w-[140px]">{asset.name}</p>
                <p className="text-[10px] text-slate-500">{asset.size}</p>
              </div>
            </div>
            <button 
              onClick={() => handleDownload(asset.name)}
              className="p-1.5 opacity-0 group-hover:opacity-100 bg-slate-800 rounded-md text-slate-300 hover:text-white transition-all"
            >
              <Download size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
