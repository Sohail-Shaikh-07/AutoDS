import React, { useState, useEffect, useRef } from "react";
import { Layout } from "./components/Layout";
import { ChatInterface, Message } from "./components/ChatInterface";
import { StatusTerminal } from "./components/StatusTerminal";
import { FileText, BarChart, FileCode, CheckCircle2 } from "lucide-react";

// Mock WebSockets for initial setup (since backend isn't running yet in this environment)
const USE_MOCK_WS = false;

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am AutoDS. Upload a dataset or ask me to start an analysis.",
    },
  ]);
  const [logs, setLogs] = useState<any[]>([]);
  const [status, setStatus] = useState("IDLE");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentThought, setCurrentThought] = useState<string | undefined>(
    undefined,
  );
  const [files, setFiles] = useState([
    { name: "analysis_report.md", type: "md" },
    { name: "model_training.ipynb", type: "ipynb" },
    { name: "dataset.csv", type: "csv" },
  ]);

  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Basic WebSocket connection
    const connect = () => {
      try {
        const socket = new WebSocket("ws://localhost:8000/ws/chat");

        socket.onopen = () => {
          addLog("Connected to AutoDS Backend", "success");
        };

        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          handleServerMessage(data);
        };

        socket.onclose = () => addLog("Disconnected from server", "warning");
        socket.onerror = (err) => addLog("Connection error", "error");

        ws.current = socket;
      } catch (e) {
        console.error(e);
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
    } else if (data.type === "response") {
      setIsProcessing(false);
      setCurrentThought(undefined);
      setStatus("IDLE");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
      addLog("Response received", "success");
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
      // Simulate response if offline/mock
      setTimeout(() => {
        handleServerMessage({
          type: "thinking",
          content: "Analyzing request locally...",
        });
        setTimeout(() => {
          handleServerMessage({
            type: "status",
            content: "Running mock analysis...",
          });
          setTimeout(() => {
            handleServerMessage({
              type: "response",
              content:
                "I cannot connect to the backend, but the UI is working!",
            });
          }, 1500);
        }, 1000);
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
        return <BarChart size={14} className="text-green-400" />;
      default:
        return <FileText size={14} />;
    }
  };

  const LeftPanel = (
    <div className="space-y-4">
      <div className="space-y-1">
        {files.map((f, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer text-gray-300 hover:text-white transition-colors"
          >
            <FileIcon type={f.type} />
            <span className="text-sm truncate">{f.name}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-white/10 pt-4">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wider">
          Recent Reports
        </div>
        <div className="flex items-center gap-2 p-2 rounded text-gray-400 text-xs">
          <CheckCircle2 size={12} className="text-green-500" />
          <span>EDA_Report_v1.md</span>
        </div>
      </div>
    </div>
  );

  return (
    <Layout
      leftPanel={LeftPanel}
      centerPanel={
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isProcessing={isProcessing}
          currentThought={currentThought}
        />
      }
      rightPanel={<StatusTerminal logs={logs} status={status} />}
    />
  );
}

export default App;
