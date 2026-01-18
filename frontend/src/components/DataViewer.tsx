import React from "react";
import { X, FileSpreadsheet } from "lucide-react";

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
  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="text-white font-medium">{filename}</h2>
            <p className="text-xs text-gray-500">{data.length} rows</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto p-6">
        <div className="border border-white/10 rounded-xl overflow-hidden shadow-2xl bg-surface">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-400 uppercase bg-black/40 sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-6 py-4 font-medium border-b border-white/10 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.slice(0, 100).map(
                (
                  row,
                  i, // Limit to 100 rows for performance
                ) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    {columns.map((col, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap">
                        {row[col]?.toString() ?? (
                          <span className="text-gray-600 italic">null</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
          {data.length > 100 && (
            <div className="p-4 text-center text-xs text-gray-500 bg-black/20 border-t border-white/10">
              Showing first 100 rows of {data.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
