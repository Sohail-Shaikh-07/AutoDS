import React, { useState, useRef, useEffect } from 'react';
import { Send, Cpu, User, Bot, Terminal, BarChart3 } from 'lucide-react';
import { sendMessageStream } from './ChatService';
import { FileUpload } from '../../components/ui/FileUpload';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'execution' | 'result' | 'thought' | 'final';
  success?: boolean;
}

export const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = 'session-' + Math.random().toString(36).substr(2, 9);

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim() || isLoading) return;

    if (!customPrompt) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: promptToSend, type: 'text' }]);
    setIsLoading(true);

    await sendMessageStream(promptToSend, sessionId, (chunk) => {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        
        // If the chunk is a new phase (execution or result), or if the last message wasn't from assistant
        if (lastMsg.role === 'user' || (chunk.type !== 'thought' && chunk.type !== lastMsg.type)) {
          return [...prev, { 
            role: 'assistant', 
            content: chunk.content, 
            type: chunk.type,
            success: chunk.success 
          }];
        } else {
          // Append to existing message if it's the same type (mostly for 'thought' streaming)
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = {
            ...lastMsg,
            content: lastMsg.content + chunk.content
          };
          return newMsgs;
        }
      });
    });

    setIsLoading(false);
  };

  const onUploadSuccess = (data: any) => {
    // When a file is uploaded, automatically ask the agent to summarize it
    const summaryPrompt = `I have uploaded a file named ${data.filename}. Please analyze its structure and give me a brief summary.`;
    handleSend(summaryPrompt);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderMessageContent = (msg: Message) => {
    if (msg.type === 'execution') {
      return (
        <div className="bg-slate-900 text-slate-300 rounded-lg p-3 font-mono text-xs my-2 border-l-4 border-brand-500">
          <div className="flex items-center gap-2 mb-2 text-brand-400">
            <Terminal size={14} />
            <span className="font-bold">Executing Agent Code...</span>
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>
      );
    }
    
    if (msg.type === 'result') {
      return (
        <div className={`rounded-lg p-3 text-xs my-2 border ${
          msg.success ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2 mb-1 font-bold">
            <BarChart3 size={14} />
            <span>Output Log:</span>
          </div>
          <pre className="whitespace-pre-wrap">{msg.content}</pre>
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500 p-2 rounded-lg">
            <Cpu className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">AutoDS Agent</h1>
            <p className="text-sm text-slate-500">AI Data Science Assistant</p>
          </div>
        </div>
      </div>

      <FileUpload onUploadSuccess={onUploadSuccess} sessionId={sessionId} />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-brand-600 text-white'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-brand-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 rounded-tl-none text-slate-800'
            }`}>
              {renderMessageContent(msg)}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Ask AutoDS to analyze your data..."
            className="w-full bg-slate-100 border-0 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-brand-500 resize-none h-[56px] text-sm"
          />
          <button 
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-2.5 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

