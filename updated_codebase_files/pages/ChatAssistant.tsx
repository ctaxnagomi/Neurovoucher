import React, { useState, useRef, useEffect } from 'react';
import { NeuroCard, NeuroInput, NeuroButton } from '../components/NeuroComponents';
import { createChatSession } from '../services/geminiService';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';

export const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your AI Financial Advisor powered by Gemini 3.0 Pro. How can I assist you with your vouchers today?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        const result = await chatSessionRef.current.sendMessageStream(userMsg.text);
        
        let fullText = "";
        const botMsgId = Date.now();
        
        // Add placeholder
        setMessages(prev => [...prev, { role: 'model', text: '', timestamp: botMsgId }]);

        for await (const chunk of result) {
            const chunkText = chunk.text();
            fullText += chunkText;
            
            setMessages(prev => prev.map(msg => 
                msg.timestamp === botMsgId ? { ...msg, text: fullText } : msg
            ));
        }

    } catch (error) {
        setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error connecting to Gemini.", timestamp: Date.now() }]);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
        <NeuroCard className="flex-1 flex flex-col overflow-hidden mb-6 relative" title="Gemini 3 Pro Advisor">
            <div className="flex-1 overflow-y-auto space-y-6 pr-4 scroll-smooth pb-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-end max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${
                                msg.role === 'user' 
                                ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' 
                                : 'bg-gradient-to-br from-purple-400 to-purple-600 text-white'
                            }`}>
                                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                            </div>
                            <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-[#e0e5ec] text-gray-800 rounded-br-none border border-white/50 shadow-[5px_5px_10px_rgba(163,177,198,0.5),-5px_-5px_10px_rgba(255,255,255,0.6)]' 
                                : 'bg-white/60 text-gray-800 rounded-bl-none border border-white/60 shadow-sm'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                     <div className="flex justify-start">
                        <div className="flex items-center gap-2 ml-14 bg-white/30 px-4 py-2 rounded-full">
                            <Sparkles size={14} className="text-purple-500 animate-spin" />
                            <span className="text-xs text-purple-600 font-medium animate-pulse">Gemini is thinking...</span>
                        </div>
                     </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="mt-4 pt-2 flex items-center gap-3">
                <div className="flex-1">
                    <NeuroInput 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about LHDN rules, tax categories..."
                        className="w-full !rounded-2xl !py-4 text-base"
                    />
                </div>
                <NeuroButton 
                    onClick={handleSend} 
                    disabled={isTyping || !input.trim()} 
                    className={`!p-0 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        !input.trim() 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'hover:scale-105 active:scale-95'
                    }`}
                >
                    <Send size={24} className={isTyping ? "text-gray-400" : "text-blue-600"} />
                </NeuroButton>
            </div>
        </NeuroCard>
    </div>
  );
};
