import React, { useState, useRef, useEffect } from 'react';
import { Send, Cpu, User, Bot, Terminal as TerminalIcon, BarChart3, ChevronRight, ChevronLeft, FolderOpen, Activity } from 'lucide-react';
import { sendMessageStream } from './ChatService';
import { FileUpload } from '../../components/ui/FileUpload';
import { ActivityTerminal, TerminalLog } from './ActivityTerminal';
import { AssetExplorer } from './AssetExplorer';
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
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'files'>('activity');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessionId] = useState(() => 'session-' + Math.random().toString(36).substr(2, 9));

  const addLog = (message: string, type: TerminalLog['type'] = 'info') => {
    setTerminalLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      message, type,
      timestamp: new Date().toLocaleTimeString([], { hour12: false }),
    }]);
  };

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim() || isLoading) return;
    if (!customPrompt) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: promptToSend, type: 'text' }]);
    addLog(`User initialized request`, 'info');
    setIsLoading(true);

    await sendMessageStream(promptToSend, sessionId, (chunk) => {
      if (chunk.type === 'thought') addLog(chunk.content, 'thought');
      if (chunk.type === 'execution') addLog(`Invoking Python Engine...`, 'exec');
      
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === 'user' || (chunk.type !== 'thought' && chunk.type !== lastMsg.type)) {
          return [...prev, { role: 'assistant', content: chunk.content, type: chunk.type, success: chunk.success, plot: chunk.plot }];
        } else {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { ...lastMsg, content: lastMsg.content + chunk.content, plot: chunk.plot || lastMsg.plot };
          return newMsgs;
        }
      });
    });
    setIsLoading(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-screen bg-[#020617] text-slate-300">
      {/* Sidebar / Left Nav (Slim) */}
      <div className="w-16 border-r border-slate-800 flex flex-col items-center py-6 gap-8 bg-[#020617]">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Cpu className="text-white" size={24} />
        </div>
        <div className="flex flex-col gap-6 text-slate-500">
          <Activity className="hover:text-blue-400 cursor-pointer transition-colors" size={20} />
          <BarChart3 className="hover:text-blue-400 cursor-pointer transition-colors" size={20} />
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#020617]/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold tracking-widest uppercase text-slate-100">AutoDS Core <span className="text-blue-500">v1.0</span></h2>
            <div className="h-4 w-px bg-slate-800"></div>
            <p className="text-[10px] text-slate-500 font-mono">{sessionId}</p>
          </div>
          <div className="flex items-center gap-4">
            <FileUpload onUploadSuccess={(d) => addLog(`File ${d.filename} ingested`, 'success')} sessionId={sessionId} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                msg.role === 'user' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-blue-600 border-blue-500 text-white'
              }`}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block rounded-2xl px-5 py-3 shadow-2xl ${
                  msg.role === 'user' ? 'bg-slate-800 text-slate-100' : 'bg-slate-900 border border-slate-800 text-slate-200'
                }`}>
                  {msg.type === 'execution' ? (
                    <div className="bg-black/40 p-4 rounded-xl font-mono text-xs my-2 text-blue-300 border border-blue-900/30">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.type === 'result' ? (
                    <div className="space-y-4">
                      <pre className="text-[11px] font-mono text-emerald-400 bg-emerald-950/10 p-2 rounded">{msg.content}</pre>
                      {msg.plot && <img src={`data:image/png;base64,${msg.plot}`} className="rounded-xl border border-slate-800 shadow-2xl max-w-full" alt="Visual" />}
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        <footer className="p-6 bg-[#020617]">
          <div className="max-w-4xl mx-auto relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Deploy a request to the agent..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 pr-16 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none h-16 shadow-2xl"
            />
            <button onClick={() => handleSend()} className="absolute right-3 top-3 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
              <Send size={20} />
            </button>
          </div>
        </footer>
      </div>

      {/* Right Command Panel */}
      <div className={`${isPanelOpen ? 'w-96' : 'w-0'} transition-all duration-300 border-l border-slate-800 flex flex-col relative bg-[#020617]`}>
        <button 
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="absolute -left-4 top-20 w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white z-20"
        >
          {isPanelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {isPanelOpen && (
          <>
            <div className="flex border-b border-slate-800">
              <button 
                onClick={() => setActiveTab('activity')}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-tighter transition-all ${activeTab === 'activity' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}
              >
                <div className="flex items-center justify-center gap-2"><TerminalIcon size={14}/> Terminal</div>
              </button>
              <button 
                onClick={() => setActiveTab('files')}
                className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-tighter transition-all ${activeTab === 'files' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}
              >
                <div className="flex items-center justify-center gap-2"><FolderOpen size={14}/> Explorer</div>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === 'activity' ? <ActivityTerminal logs={terminalLogs} /> : <AssetExplorer sessionId={sessionId} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
