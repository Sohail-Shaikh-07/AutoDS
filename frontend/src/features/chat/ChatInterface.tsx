import React, { useState, useRef, useEffect } from 'react';
import { Send, Cpu, User, Bot } from 'lucide-react';
import { sendMessageStream } from './ChatService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thoughts?: string[];
}

export const ChatInterface: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentThoughts, setCurrentThoughts] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);
    setCurrentThoughts([]);

    let assistantMsgContent = '';
    
    // Create a placeholder for the assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '', thoughts: [] }]);

    await sendMessageStream(userMsg, 'session-123', (chunk) => {
      if (chunk.type === 'thought') {
        // We'll treat all content as thoughts if it's not explicitly a final answer
        // Note: In our current backend, we are just streaming content. 
        // We need to differentiate thought vs final in the future. 
        // For now, let's append to the main content for visibility.
        assistantMsgContent += chunk.content;
        
        setMessages(prev => {
          const newMsgs = [...prev];
          const lastMsg = newMsgs[newMsgs.length - 1];
          lastMsg.content = assistantMsgContent;
          return newMsgs;
        });
      }
    });

    setIsLoading(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentThoughts]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3 shadow-sm">
        <div className="bg-brand-500 p-2 rounded-lg">
          <Cpu className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">AutoDS Agent</h1>
          <p className="text-sm text-slate-500">AI Data Science Assistant</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' ? 'bg-slate-200' : 'bg-brand-600'
            }`}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-white" />}
            </div>
            
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-brand-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-100 rounded-tl-none'
            }`}>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
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
            className="w-full bg-slate-100 border-0 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-brand-500 resize-none h-[60px]"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-3 p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
