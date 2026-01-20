import React, { useState } from "react";
import { Database, X, Loader } from "lucide-react";

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (config: any) => Promise<void>;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  onConnect,
}) => {
  const [config, setConfig] = useState({
    type: "postgresql",
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "",
    database: "postgres",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConnect(config);
      onClose();
    } catch (err: any) {
      setError(err.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[400px] bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-white">
            <Database size={20} className="text-blue-400" />
            <span className="font-semibold text-lg">Connect Database</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Type</label>
            <select
              className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-blue-500"
              value={config.type}
              onChange={(e) => setConfig({ ...config, type: e.target.value })}
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlite">SQLite</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Host</label>
              <input
                type="text"
                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-blue-500 placeholder-slate-600"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="localhost"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Port</label>
              <input
                type="number"
                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-blue-500 placeholder-slate-600"
                value={config.port}
                onChange={(e) =>
                  setConfig({ ...config, port: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">User</label>
              <input
                type="text"
                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-blue-500 placeholder-slate-600"
                value={config.user}
                onChange={(e) => setConfig({ ...config, user: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-blue-500 placeholder-slate-600"
                value={config.password}
                onChange={(e) =>
                  setConfig({ ...config, password: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Database Name
            </label>
            <input
              type="text"
              className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-blue-500 placeholder-slate-600"
              value={config.database}
              onChange={(e) =>
                setConfig({ ...config, database: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              "Connect Database"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
