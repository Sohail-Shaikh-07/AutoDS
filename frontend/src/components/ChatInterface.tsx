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
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

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

      {/* Messages Area - Flexible height with scrolling */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="max-w-3xl mx-auto space-y-6 pb-24">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-4 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-lg ${
                  msg.role === "user"
                    ? "bg-primary text-white"
                    : "bg-surface border border-white/5 text-gray-300"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert max-w-none prose-pre:bg-black/50 prose-pre:p-0">
                    <ReactMarkdown
                      components={{
                        code({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isProcessing && currentThought && (
            <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-2 rounded-full bg-surface border border-white/10">
                <BrainCircuit
                  size={16}
                  className="text-secondary animate-pulse"
                />
              </div>
              <div className="max-w-[85%] space-y-2">
                <div className="text-xs font-mono text-secondary flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                  {currentThought}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full p-4 border-t border-white/10 bg-background/80 backdrop-blur-md z-20">
        <div className="max-w-3xl mx-auto relative">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl opacity-20 blur group-hover:opacity-30 transition-opacity pointer-events-none" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AutoDS to analyze your data..."
              className="w-full bg-surface border border-white/10 text-white rounded-xl py-4 pl-12 pr-14 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-xl placeholder:text-gray-500 relative z-10"
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
