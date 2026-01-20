import React, { useState } from "react";
import { X, FileSpreadsheet, Activity } from "lucide-react";

interface DataViewerProps {
  filename: string;
  data: any[];
  columns: string[];
  onClose: () => void;
}

export const DataViewer: React.FC<DataViewerProps> = ({
  filename,
  data,
  columns,
  onClose,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/generate_eda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const result = await response.json();

      if (result.html) {
        // Open HTML in new tab by creating a blob
        const blob = new Blob([result.html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        alert("Error generating report: " + (result.error || "Unknown error"));
      }
    } catch (e) {
      alert("Failed to connect to server for EDA.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <FileSpreadsheet size={18} className="text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">{filename}</h3>
            <p className="text-xs text-slate-400">
              {data.length} rows • {columns.length} columns
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded-md transition-colors"
          >
            {isGenerating ? (
              <>
                <Activity size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Activity size={14} />
                Auto-EDA Report
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/5 sticky top-0 backdrop-blur-md">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-xs font-medium text-slate-300 border-b border-white/10 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.slice(0, 100).map((row, i) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                {columns.map((col) => (
                  <td
                    key={`${i}-${col}`}
                    className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap"
                  >
                    {String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 100 && (
          <div className="p-4 text-center text-xs text-slate-500 italic border-t border-white/5">
            Showing first 100 rows. Use Python queries for full analysis.
          </div>
        )}
      </div>
    </div>
  );
};
