import { useState, useEffect, useRef } from "react";
import { Layout } from "./components/Layout";
import { ChatInterface } from "./components/ChatInterface";
import type { Message } from "./components/ChatInterface";
import { StatusTerminal } from "./components/StatusTerminal";
import { FileText, BarChart, FileCode, CheckCircle2 } from "lucide-react";

// Mock WebSockets disabled
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
        socket.onerror = (_err) => addLog("Connection error", "error");

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
      setCurrentThought(undefined);

      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];

        // Check if the last conversation item is from the assistant and we are currently processing
        // OR if the backend sends multiple chunks, we update the last one.
        if (lastMsg.role === "assistant" && !isProcessing) {
          // Logic trap: isProcessing is false at start, set to true on send.
          // But inside callback, state might be closed over.
          // Instead, check if the last message content is DIFFERENT from what we have?
          // Actually, simplest logic handled by state:
          // If we are getting a stream, we want to update the last assistant message.
          const newHistory = [...prev];
          // Assumption: The last message IS the assistant's placeholder or previous chunk
          newHistory[newHistory.length - 1] = {
            ...lastMsg,
            content: data.content,
          };
          return newHistory;
        } else {
          // Determine if we should append or update based on message count/role
          if (lastMsg.role === "assistant") {
            // Append to existing
            const newContent = data.content;
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = {
              ...lastMsg,
              content: newContent,
            };
            return newHistory;
          }
          // New message logic should rarely be hit if we initialize with a placeholder?
          // The backend logic sends cumulative buffer 'response_buffer', so REPLACING content is correct.
          return [...prev, { role: "assistant", content: data.content }];
        }
      });

      // Update global status only on first chunk if needed
      if (isProcessing) {
        setIsProcessing(false);
        setStatus("GENERATING...");
      }
    } else if (data.type === "done") {
      setStatus("IDLE");
      addLog("Analysis Complete", "success");
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    addLog(`Uploading ${file.name}...`, "info");

    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        addLog(`Uploaded ${file.name}`, "success");
        // Update file list (mock for now, ideally fetch from backend)
        setFiles((prev) => [
          ...prev,
          { name: file.name, type: file.name.split(".").pop() || "file" },
        ]);
        // Trigger analysis prompt automatically?
        handleSendMessage(`I have uploaded ${file.name}. Please analyze it.`);
      } else {
        addLog(`Upload failed: ${data.detail || "Unknown error"}`, "error");
      }
    } catch (error) {
      addLog(`Upload error: ${error}`, "error");
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
