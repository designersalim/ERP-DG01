import React, { useState, useEffect, useRef } from 'react';
import { COMPANY_PROFILE } from '../data';
import { 
  X, 
  MessageSquare, 
  Send, 
  Sparkles, 
  User, 
  Loader2, 
  ArrowDownCircle, 
  Maximize2 
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface AIChatbotProps {
  contextData: {
    bookingsCount: number;
    pisCount: number;
    challansCount: number;
    productsCount: number;
    activeTab: string;
  };
}

export default function AIChatbot({ contextData }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-init-1',
        sender: 'assistant',
        text: 'আসসালামু আলাইকুম! আমি Acoola Soft-এর অফিশিয়াল ERP এআই সহকারী। আজকের ক্যাটালগ এগ্রিগেশন, গার্মেন্টস ট্রিমস বুকিং অথবা রিয়েল-টাইম কম্পিউটার সিঙ্ক নিয়ে আপনার সাহায্য প্রয়োজন?',
        timestamp: new Date()
      }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend,
          context: {
            ...contextData,
            companyName: COMPANY_PROFILE.name,
            currentDeviceTime: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error('AI Service error');
      }

      const data = await response.json();
      
      const assistantMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        text: data.text || 'আমি আপনার প্রশ্নটির উত্তর প্রস্তুত করতে পারিনি। দয়া করে আবার চেষ্টা করুন।',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Chat AI failure:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'assistant',
          text: 'দুঃখিত, ইন্টারনেট বা সার্ভার সমস্যার কারণে আমি যুক্ত হতে পারছি না। আপনার গুগল সাইন-ইন বা ক্লাউড সিঙ্ক অ্যাক্টিভ রয়েছে কি না চেক করুন।',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage(inputValue);
    }
  };

  const quickPrompts = [
    { label: 'কম্পিউটার ডেটা সিঙ্ক কীভাবে করব?', query: 'আমার বাসার পিসি এবং অফিসের পিসির ডেটা কীভাবে স্বয়ংক্রিয় সিঙ্ক ও রিস্টোর করব একটু বুঝিয়ে বলো' },
    { label: 'ট্রিমস বুকিং এন্ট্রি গাইড', query: 'কিভাবে একটি নতুন চালান বা বুকিং ইনপুট দেবো এবং তা এডিট করতে পারবো?' },
    { label: 'PRO ক্যাটালগ প্রিন্ট গাইড', query: 'প্রোডাক্ট ক্যাটালগের প্রিন্ট ভিউ ২-কলাম লেআউট-এর সুবিধাগুলো কী?' },
  ];

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden font-sans">
      {/* Collapsed Chat Icon Pin */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-[#007d46] hover:bg-[#006035] active:scale-95 text-white font-heavy rounded-full shadow-2xl transition-all cursor-pointer ring-4 ring-emerald-50 dark:ring-emerald-950/40 relative hover:-translate-y-0.5 group animate-bounce"
          style={{ animationDuration: '3s' }}
          id="floating-ai-launcher"
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-0.5 right-0.5"></div>
          <Sparkles className="w-4 h-4 text-emerald-100 group-hover:rotate-12 transition-transform" />
          <span className="text-xs uppercase tracking-wider font-extrabold font-display">Acoola AI Copilot</span>
        </button>
      )}

      {/* Expanded Interactive Chat Interface card */}
      {isOpen && (
        <div 
          className="w-[380px] h-[500px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in"
          id="ai-chatbot-window"
        >
          {/* Header Block bar */}
          <div className="bg-[#007d46] p-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Sparkles className="w-4 h-4 text-emerald-100" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs tracking-wide uppercase">Acoola Smart AI</h3>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-100">Workspace Connected</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-black/10 rounded-lg text-emerald-100 hover:text-white transition-colors cursor-pointer"
                title="Collapse Chat"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Messages Trace display */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 dark:bg-slate-950">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className={`flex gap-2 max-w-[85%] ${m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Avatar icon */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                  m.sender === 'user' 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100' 
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-100'
                }`}>
                  {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                </div>

                {/* Bubble box */}
                <div className={`p-2.5 rounded-xl text-xs space-y-1 shadow-xs border ${
                  m.sender === 'user'
                    ? 'bg-blue-600 border-blue-500 text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-line leading-relaxed">{m.text}</p>
                  <p className={`text-[8px] text-right font-medium ${m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Pulsing loading state */}
            {isLoading && (
              <div className="flex gap-2 max-w-[80%]">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-100 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-850 shadow-xs text-[10px] text-slate-500 flex items-center gap-1.5 animate-pulse">
                  <span>এআই সহকারী ভাবছে...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Quick Prompts tray */}
          {messages.length === 1 && !isLoading && (
            <div className="p-2 border-t border-slate-150 bg-slate-50 dark:bg-slate-950/70 space-y-1 hover:overflow-x-auto">
              <span className="text-[8px] font-bold text-slate-500 uppercase px-1 tracking-wider block">কম্পিউটার সিঙ্ক ও এফএকিউ:</span>
              <div className="flex flex-col gap-1">
                {quickPrompts.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(qp.query)}
                    className="text-left w-full text-[9.5px] px-2 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-[#007d46] dark:hover:text-emerald-350 text-slate-650 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded transition-all cursor-pointer font-medium truncate"
                  >
                    ✦ {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom input area */}
          <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder="এআই কে আপনার প্রশ্নটি করুন..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 outline-hidden focus:ring-1 focus:ring-[#007d46] dark:focus:ring-emerald-600 font-medium Disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="p-2 bg-[#007d46] hover:bg-[#006035] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-lg transition-colors cursor-pointer shrink-0"
              title="Send Inquiry"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
