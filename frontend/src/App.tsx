import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Layout } from "./components/Layout";
import { ChatInterface } from "./components/ChatInterface";
import { DataViewer } from "./components/DataViewer";
import type { Message } from "./components/ChatInterface";
import { StatusTerminal } from "./components/StatusTerminal";
import { FileText, BarChart, FileCode } from "lucide-react";

// Mock WebSockets disabled
const USE_MOCK_WS = false;

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [status, setStatus] = useState("IDLE");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentThought, setCurrentThought] = useState<string | undefined>(
    undefined,
  );
  // Start with empty file list (no mock data)
  const [files, setFiles] = useState<{ name: string; type: string }[]>([]);

  // Viewer State
  const [activeFile, setActiveFile] = useState<{
    filename: string;
    data: any[];
    columns: string[];
  } | null>(null);

  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Basic WebSocket connection
    const connect = () => {
      try {
        const socket = new WebSocket("ws://127.0.0.1:8000/ws/chat");

        socket.onopen = () => {
          addLog("Connected to AutoDS Backend", "success");
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          handleServerMessage(data);
        };

        socket.onclose = () => {
          addLog("Disconnected from server", "warning");
          setIsProcessing(false);
          setStatus("DISCONNECTED");
        };
        socket.onerror = (_err) => {
          addLog("Connection error", "error");
          setIsProcessing(false);
          setStatus("ERROR");
        };

        ws.current = socket;
      } catch (e) {
        console.error(e);
        setIsProcessing(false);
      }
    };

    if (!USE_MOCK_WS) connect();

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  const addLog = (
    message: string,
    type: "info" | "success" | "warning" | "error" | "system" = "info",
  ) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      },
    ]);
  };

  const handleServerMessage = (data: any) => {
    if (data.type === "status") {
      setStatus(data.content.toUpperCase().substring(0, 20));
      addLog(data.content, "system");
    } else if (data.type === "thinking") {
      setCurrentThought(data.content);
      addLog(`Thinking: ${data.content}`, "info");

      // Update the current assistant message with this thought
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === "assistant") {
          const thoughts = lastMsg.thoughts || [];
          if (!thoughts.includes(data.content)) {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, thoughts: [...thoughts, data.content] },
            ];
          }
          return prev;
        } else {
          // Create new assistant message if it doesn't exist yet
          return [
            ...prev,
            { role: "assistant", content: "", thoughts: [data.content] },
          ];
        }
      });
    } else if (data.type === "response") {
      setCurrentThought(undefined);

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];

        // Since backend sends CUMULATIVE response, we always REPLACE the content
        if (lastMsg && lastMsg.role === "assistant") {
          return [...prev.slice(0, -1), { ...lastMsg, content: data.content }];
        } else {
          // If no assistant message exists yet (start of turn), create one
          return [...prev, { role: "assistant", content: data.content }];
        }
      });

      // Update global status only on first chunk if needed
      if (isProcessing) {
        // We DON'T set isProcessing(false) here, only on "done"
        setStatus("GENERATING...");
      }
    } else if (data.type === "plot") {
      addLog("Received Plot Data", "success");
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === "assistant") {
          return [...prev.slice(0, -1), { ...lastMsg, plotData: data.content }];
        }
        return prev;
      });
    } else if (data.type === "done") {
      setStatus("IDLE");
      setIsProcessing(false); // <--- CRITICAL FIX: Unlock input
      setCurrentThought(undefined);
      addLog("Analysis Complete", "success");
    } else if (data.type === "error") {
      setStatus("ERROR");
      setIsProcessing(false); // <--- CRITICAL FIX: Unlock input
      setCurrentThought(undefined);
      addLog(`Error: ${data.content}`, "error");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `**Error:** ${data.content}` },
      ]);
    }
  };

  const handleSendMessage = (text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsProcessing(true);
    setCurrentThought("Initializing request...");

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ prompt: text }));
    } else {
      // Fallback or attempt reconnect
      addLog("WebSocket not connected", "error");
      setTimeout(() => {
        // Mock response if needed
        setIsProcessing(false);
      }, 500);
    }
  };

  const FileIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "md":
        return <FileText size={14} className="text-blue-400" />;
      case "ipynb":
        return <FileCode size={14} className="text-orange-400" />;
      case "csv":
      case "xlsx":
        return <BarChart size={14} className="text-green-400" />;
      default:
        return <FileText size={14} />;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    addLog(`Uploading ${file.name}...`, "info");

    try {
      const response = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        addLog(`Uploaded ${file.name}`, "success");
        setFiles((prev) => [
          ...prev,
          { name: file.name, type: file.name.split(".").pop() || "file" },
        ]);
        // Auto-open the file for viewing - DISABLED per user request
        // handleFileClick(file.name);
      } else {
        addLog(`Upload failed: ${data.detail || "Unknown error"}`, "error");
      }
    } catch (error) {
      addLog(`Upload error: ${error}`, "error");
    }
  };

  const handleFileClick = async (filename: string) => {
    addLog(`Opening ${filename}...`, "info");
    try {
      const response = await fetch(`http://127.0.0.1:8000/files/${filename}`);
      const result = await response.json();

      if (result.error) {
        addLog(`Error opening file: ${result.error}`, "error");
        return;
      }

      if (result.type === "csv" || result.type === "xlsx") {
        setActiveFile({
          filename: result.filename,
          data: result.data,
          columns: result.columns,
        });
      } else {
        addLog(`Preview not supported for ${filename} yet`, "warning");
      }
    } catch (e) {
      addLog(`Error fetching file: ${e}`, "error");
    }
  };

  const LeftPanel = (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="p-2">
        <label className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-white rounded-lg p-2 cursor-pointer transition-colors text-sm font-medium">
          <span className="text-lg">+</span> Upload Dataset
          <input
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.json"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      <div className="space-y-1">
        {files.length === 0 && (
          <div className="text-gray-600 text-xs text-center p-4 italic">
            No files uploaded yet.
          </div>
        )}
        {files.map((f, i) => (
          <div
            key={i}
            onClick={() => handleFileClick(f.name)}
            className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer text-gray-300 hover:text-white transition-colors"
          >
            <FileIcon type={f.type} />
            <span className="text-sm truncate">{f.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const handleNewSession = async () => {
    if (
      !confirm(
        "Are you sure you want to start a new session? This will verify connectivity to a new unique history file.",
      )
    )
      return;

    addLog("Initiating New Session...", "system");
    try {
      const res = await fetch("http://127.0.0.1:8000/reset_session", {
        method: "POST",
      });
      const data = await res.json();

      if (data.status === "success") {
        // Clear all local state
        setMessages([]);
        setLogs([]); // Optional: keep logs or clear them? User said "new memory and all". Let's clear.
        setFiles([]);
        setActiveFile(null);
        setStatus("IDLE");
        addLog(`Session Reset. New ID: ${data.session_id}`, "success");
        addLog("Ready for new analysis.", "info");
      } else {
        addLog("Failed to reset session.", "error");
      }
    } catch (e) {
      addLog(`Error resetting session: ${e}`, "error");
    }
  };

  return (
    <>
      <Layout
        leftPanel={LeftPanel}
        centerPanel={
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
            currentThought={currentThought}
            currentStatus={status}
          />
        }
        rightPanel={
          <StatusTerminal
            logs={logs}
            status={status}
            onNewSession={handleNewSession}
          />
        }
      />

      <AnimatePresence>
        {activeFile && (
          <DataViewer
            filename={activeFile.filename}
            data={activeFile.data}
            columns={activeFile.columns}
            onClose={() => setActiveFile(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
