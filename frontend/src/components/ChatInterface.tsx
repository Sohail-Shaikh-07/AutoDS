import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  User,
  ChevronRight,
  BrainCircuit,
  Paperclip,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// --- Types ---
export interface Message {
  role: "user" | "assistant";
  content: string;
  thoughts?: string[];
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isProcessing: boolean;
  currentThought?: string;
}

// --- Main Component ---
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  currentThought,
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentThought]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-white relative font-sans selection:bg-primary/30">
      {/* Decorative localized glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary/5 blur-[100px] pointer-events-none" />

      {/* --- Messages Area --- */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-4 pb-32">
        <div className="max-w-3xl mx-auto space-y-8 mt-4">
          {/* Welcome Placeholder */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 opacity-50 animate-in fade-in duration-700">
              <div className="p-4 rounded-full bg-white/5 border border-white/5 mb-4">
                <Bot size={48} className="text-white/80" />
              </div>
              <h1 className="text-2xl font-semibold bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
                AutoDS Workspace
              </h1>
              <p className="text-sm text-gray-400 max-w-md">
                Upload a dataset to the left or describe your analysis goal to
                get started.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <MessageItem key={idx} message={msg} />
          ))}

          {/* Current Processing State */}
          {isProcessing && (
            <div className="flex gap-4 animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <Bot size={16} className="text-indigo-400" />
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {/* Active Thought Indicator */}
                {currentThought ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-300">
                    <RefreshCw size={12} className="animate-spin" />
                    {currentThought}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 h-6">
                    <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* --- Sticky Input Area --- */}
      <div className="bg-[#09090b]/80 backdrop-blur-xl border-t border-white/5 p-4 absolute bottom-0 w-full z-20">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative group">
            {/* Input Gradient Border Effect */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative flex items-end gap-2 bg-[#18181b] border border-white/10 rounded-xl p-2 shadow-2xl">
              {/* Upload Action (Visual Only) */}
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Paperclip size={18} />
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask AutoDS to analyze, visualize, or transform data..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none py-2.5 max-h-[200px] min-h-[44px] resize-none scrollbar-hide"
                rows={1}
              />

              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="p-2 bg-white text-black rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} className={clsx(isProcessing && "opacity-0")} />
                {isProcessing && (
                  <RefreshCw
                    size={16}
                    className="absolute inset-0 m-auto animate-spin"
                  />
                )}
              </button>
            </div>
            <div className="text-center mt-2 text-[10px] text-gray-500 font-medium">
              AI Agent can make mistakes. Review generated code.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div
      className={clsx(
        "flex gap-4 group",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30 mt-1">
          <Bot size={16} className="text-indigo-400" />
        </div>
      )}

      <div className={clsx("flex flex-col max-w-[85%]", isUser && "items-end")}>
        {/* Name Label */}
        <span className="text-[10px] text-gray-500 mb-1 ml-1 font-mono uppercase tracking-wider">
          {isUser ? "You" : "AutoDS Agent"}
        </span>

        {/* Message Bubble/Container */}
        <div
          className={clsx(
            "rounded-2xl p-4 shadow-sm relative overflow-hidden",
            isUser
              ? "bg-[#27272a] text-white border border-white/5" // User: Dark Gray Bubble
              : "bg-transparent text-gray-200 pl-0 pt-0", // AI: Transparent, clean text
          )}
        >
          {/* Thinking Dropdown (Only for AI) */}
          {!isUser && message.thoughts && message.thoughts.length > 0 && (
            <ThinkingBlock thoughts={message.thoughts} />
          )}

          {/* Markdown Content */}
          <div
            className={clsx(
              "prose prose-invert prose-sm max-w-none leading-relaxed",
              !isUser &&
                "prose-pre:bg-[#18181b] prose-pre:border prose-pre:border-white/5",
            )}
          >
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <div className="relative group/code my-4">
                      <div className="absolute right-2 top-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                        <div className="bg-[#27272a] p-1.5 rounded-md border border-white/10 shadow-xl">
                          <div className="text-[10px] text-gray-400 px-1 font-mono">
                            {match[1]}
                          </div>
                        </div>
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: "0.75rem",
                          border: "1px solid rgba(255,255,255,0.1)",
                          fontSize: "13px",
                          lineHeight: "1.5",
                          padding: "1rem",
                        }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code
                      className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[12px]"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                // Custom Table Styling
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4 border border-white/10 rounded-lg">
                    <table className="w-full text-left text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-white/5 text-gray-300">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="p-2 font-medium border-b border-white/5">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="p-2 border-b border-white/5 text-gray-400">
                    {children}
                  </td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-[#27272a] flex items-center justify-center shrink-0 border border-white/5 mt-1">
          <User size={16} className="text-gray-300" />
        </div>
      )}
    </div>
  );
};

const ThinkingBlock: React.FC<{ thoughts: string[] }> = ({ thoughts }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all text-xs text-gray-400 font-mono w-fit"
      >
        <BrainCircuit size={14} className={clsx(isOpen && "text-indigo-400")} />
        <span className={clsx(isOpen && "text-gray-200")}>Process Trace</span>
        <span className="bg-white/10 px-1.5 rounded text-[10px]">
          {thoughts.length}
        </span>
        <ChevronRight
          size={14}
          className={clsx(
            "transition-transform duration-200",
            isOpen && "rotate-90",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden ml-2"
          >
            <div className="flex flex-col gap-3 pl-4 border-l border-white/10 py-3 mt-1">
              {thoughts.map((step, i) => (
                <div
                  key={i}
                  className="flex gap-3 text-xs font-mono group animate-in slide-in-from-left-2 fade-in duration-300"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="text-gray-600 select-none min-w-[16px]">
                    {i + 1}.
                  </span>
                  <span className="text-gray-400 group-hover:text-gray-300 transition-colors">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
