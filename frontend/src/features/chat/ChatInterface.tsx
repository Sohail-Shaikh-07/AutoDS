import React, { useState, useRef, useEffect } from 'react';
import { Send, Cpu, User, Bot, Terminal as TerminalIcon, BarChart3, Layers } from 'lucide-react';
import { sendMessageStream } from './ChatService';
import { FileUpload } from '../../components/ui/FileUpload';
import { ActivityTerminal, TerminalLog } from './ActivityTerminal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'execution' | 'result' | 'thought' | 'final';
  success?: boolean;
  plot?: string;
}

export const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessionId] = useState(() => 'session-' + Math.random().toString(36).substr(2, 9));

  const addLog = (message: string, type: TerminalLog['type'] = 'info') => {
    const newLog: TerminalLog = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
    };
    setTerminalLogs(prev => [...prev, newLog]);
  };

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim() || isLoading) return;

    if (!customPrompt) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: promptToSend, type: 'text' }]);
    addLog(`User: ${promptToSend}`, 'info');
    setIsLoading(true);

    await sendMessageStream(promptToSend, sessionId, (chunk) => {
      // Feed to Terminal
      if (chunk.type === 'thought') addLog(`Thinking: ${chunk.content}`, 'thought');
      if (chunk.type === 'execution') addLog(`Executing Code...`, 'exec');
      if (chunk.type === 'result') {
        chunk.success ? addLog(`Code execution successful`, 'success') : addLog(`Execution failed: ${chunk.content.substring(0, 50)}...`, 'error');
      }

      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === 'user' || (chunk.type !== 'thought' && chunk.type !== lastMsg.type)) {
          return [...prev, { 
            role: 'assistant', 
            content: chunk.content, 
            type: chunk.type,
            success: chunk.success,
            plot: chunk.plot
          }];
        } else {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = {
            ...lastMsg,
            content: lastMsg.content + chunk.content,
            plot: chunk.plot || lastMsg.plot
          };
          return newMsgs;
        }
      });
    });

    setIsLoading(false);
    addLog(`Agent response complete`, 'info');
  };

  const onUploadSuccess = (data: any) => {
    addLog(`System: File ${data.filename} uploaded and pre-loaded into 'df' successfully.`, 'success');
    // NO AUTO-PROMPT triggered here anymore.
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Left Panel: Chat (60%) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        {/* Header */}
        <div className="h-16 border-b px-6 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600 p-2 rounded-lg text-white">
              <Cpu size={20} />
            </div>
            <div>
              <h1 className="text-md font-bold text-slate-900">AutoDS Agent</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Workspace</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all">
              <Layers size={18} />
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <FileUpload onUploadSuccess={onUploadSuccess} sessionId={sessionId} />

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                <BarChart3 size={32} />
              </div>
              <div className="max-w-xs">
                <h3 className="text-slate-900 font-bold">Start your Data Mission</h3>
                <p className="text-xs text-slate-500 mt-1">Upload a dataset and ask me to analyze, visualize, or build models.</p>
              </div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                msg.role === 'user' ? 'bg-white text-slate-600 border-slate-200' : 'bg-slate-900 text-white border-slate-900'
              }`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''}`}>
                <div className={`rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user' 
                    ? 'bg-brand-600 text-white shadow-md' 
                    : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}>
                  {msg.type === 'execution' ? (
                    <div className="bg-slate-900 text-blue-400 p-3 rounded-lg font-mono text-xs my-1 overflow-x-auto">
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.type === 'result' ? (
                    <div className="space-y-2">
                      <pre className="text-[10px] font-mono opacity-80 whitespace-pre-wrap">{msg.content}</pre>
                      {msg.plot && <img src={`data:image/png;base64,${msg.plot}`} className="rounded-lg border border-slate-200 bg-white" alt="Output" />}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-slate">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <div className="max-w-4xl mx-auto relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Query your dataset..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none h-[60px] text-sm text-slate-800 shadow-inner"
            />
            <button 
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-2.5 p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-30 disabled:grayscale transition-all shadow-lg"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel: Terminal Activity (40%) */}
      <div className="w-[40%] hidden lg:block">
        <ActivityTerminal logs={terminalLogs} />
      </div>
    </div>
  );
};