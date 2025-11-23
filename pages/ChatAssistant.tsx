import React, { useState, useRef, useEffect } from 'react';
import { NeuroCard, NeuroInput, NeuroButton } from '../components/NeuroComponents';
import { createChatSession } from '../services/geminiService';
import { Send, Bot, User } from 'lucide-react';
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
        <NeuroCard className="flex-1 flex flex-col overflow-hidden mb-6" title="Gemini 3 Pro Advisor">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-200 text-blue-700' : 'bg-purple-200 text-purple-700'}`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-[#d1d9e6] text-gray-800 shadow-[inset_3px_3px_6px_rgba(163,177,198,0.4),inset_-3px_-3px_6px_rgba(255,255,255,0.4)]' 
                                : 'bg-[#e0e5ec] text-gray-700 shadow-[5px_5px_10px_rgba(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                     <div className="flex justify-start">
                        <div className="ml-12 text-xs text-gray-400 animate-pulse">Gemini is thinking...</div>
                     </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-300/30 flex gap-4">
                <NeuroInput 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about LHDN rules, tax categories..."
                    className="flex-1"
                />
                <NeuroButton onClick={handleSend} disabled={isTyping} className="rounded-full w-12 h-12 flex items-center justify-center p-0">
                    <Send size={20} className={isTyping ? "text-gray-400" : "text-blue-600"} />
                </NeuroButton>
            </div>
        </NeuroCard>
    </div>
  );
};
