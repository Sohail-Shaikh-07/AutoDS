import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  ChevronDown,
  ChevronRight,
  BrainCircuit,
  Paperclip,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

export interface Message {
  role: "user" | "assistant";
  content: string;
  thoughts?: string[]; // Internal monologue steps
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isProcessing: boolean;
  currentThought?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  currentThought,
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, currentThought]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={clsx(
              "flex gap-4 max-w-3xl mx-auto",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <Bot size={18} className="text-white" />
              </div>
            )}

            <div className="max-w-[80%] space-y-2">
              <div
                className={clsx(
                  "p-4 rounded-2xl shadow-sm border",
                  msg.role === "user"
                    ? "bg-surface border-white/10 text-white rounded-tr-sm"
                    : "bg-surface/50 border-white/5 text-gray-200 rounded-tl-sm backdrop-blur-md",
                )}
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>

              {/* Collapsible Thoughts (if any) */}
              {msg.thoughts && msg.thoughts.length > 0 && (
                <ThinkingBlock thoughts={msg.thoughts} />
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <User size={18} className="text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Real-time Thinking Indicator */}
        {isProcessing && (
          <div className="flex gap-4 max-w-3xl mx-auto animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
              <Bot size={18} className="text-white animate-pulse" />
            </div>
            <div className="max-w-[80%] w-full space-y-2">
              {currentThought ? (
                <div className="bg-surface/30 border border-primary/20 rounded-xl p-3 flex items-center gap-3 thinking-gradient">
                  <BrainCircuit
                    size={16}
                    className="text-primary animate-pulse"
                  />
                  <span className="text-sm text-primary/80 font-mono">
                    {currentThought}
                  </span>
                </div>
              ) : (
                <div className="flex gap-1 h-2 items-center pl-2">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-background/80 backdrop-blur-md z-20">
        <div className="max-w-3xl mx-auto relative">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl opacity-20 blur group-hover:opacity-30 transition-opacity" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AutoDS to analyze your data..."
              className="w-full bg-surface border border-white/10 text-white rounded-xl py-4 pl-12 pr-14 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-xl placeholder:text-gray-500"
            />
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
            >
              <Paperclip size={20} />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="text-center mt-2 text-[10px] text-gray-600">
            AutoDS can make mistakes. Please verify critical insights.
          </div>
        </div>
      </div>
    </div>
  );
};

const ThinkingBlock: React.FC<{ thoughts: string[] }> = ({ thoughts }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-black/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-400 font-mono"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>Process Trace ({thoughts.length} steps)</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2 text-xs font-mono text-gray-500 border-t border-white/5 bg-black/40">
              {thoughts.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-600 select-none">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
