import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { NeuroButton, NeuroCard } from './NeuroComponents';
import { Mic, FileText, MessageSquare, Image as ImageIcon, BarChart2, ClipboardList, Settings, ScrollText, Radio, Monitor, MicOff, Maximize2, Cpu } from 'lucide-react';
import { useLiveAgent } from '../contexts/LiveAgentContext';

const SidebarItem = ({ to, icon: Icon, label, extra }: { to: string; icon: any; label: string, extra?: React.ReactNode }) => (
  <NavLink to={to} className={({ isActive }) => `block mb-4 no-underline`}>
    {({ isActive }) => (
      <NeuroButton active={isActive} className="w-full flex items-center gap-3 justify-start relative">
        <Icon size={20} />
        <span className="flex-1 text-left">{label}</span>
        {extra}
      </NeuroButton>
    )}
  </NavLink>
);

const AIFocusOverlay = () => {
    const [targets, setTargets] = useState<{rect: DOMRect, label: string}[]>([]);

    useEffect(() => {
        const handleHighlight = (e: CustomEvent) => {
            const fields = e.detail.fields as string[];
            const newTargets: {rect: DOMRect, label: string}[] = [];

            fields.forEach(field => {
                // Find element by name attribute
                const el = document.querySelector(`[name="${field}"]`);
                if (el) {
                    newTargets.push({
                        rect: el.getBoundingClientRect(),
                        label: field
                    });
                }
            });

            if (newTargets.length > 0) {
                setTargets(newTargets);
                // Clear highlight after 3 seconds
                setTimeout(() => setTargets([]), 3000);
            }
        };

        window.addEventListener('neuro-ai-highlight' as any, handleHighlight as any);
        return () => window.removeEventListener('neuro-ai-highlight' as any, handleHighlight as any);
    }, []);

    if (targets.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] ai-focus-overlay">
            {targets.map((t, i) => (
                <div 
                    key={i}
                    style={{
                        top: t.rect.top - 4,
                        left: t.rect.left - 4,
                        width: t.rect.width + 8,
                        height: t.rect.height + 8
                    }}
                    className="absolute border-2 border-green-500 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-300 animate-pulse"
                >
                    <div className="absolute -top-6 left-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md flex items-center gap-1">
                        <Cpu size={10} /> AI WRITING
                    </div>
                </div>
            ))}
        </div>
    );
};

const FloatingAgentWidget = () => {
    const { connected, isSpeaking, disconnect } = useLiveAgent();
    const navigate = useNavigate();
    const location = useLocation();

    // Handle AI Navigation Requests
    useEffect(() => {
        const handleNavigate = (e: CustomEvent) => {
            const path = e.detail;
            if (path && path.startsWith('/')) {
                navigate(path);
            }
        };
        window.addEventListener('neuro-navigate' as any, handleNavigate as any);
        return () => window.removeEventListener('neuro-navigate' as any, handleNavigate as any);
    }, [navigate]);

    // Do not show on the Live Agent page itself to avoid duplication
    if (!connected || location.pathname === '/live') return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 duration-500 live-agent-widget">
            <div className="bg-[#e0e5ec] p-4 rounded-2xl shadow-[9px_9px_16px_rgba(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)] border border-white/50 flex flex-col items-center gap-3 w-48">
                
                {/* Header */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isSpeaking ? 'bg-blue-500 animate-bounce' : 'bg-green-500 animate-pulse'}`}></span>
                        <span className="text-xs font-bold text-gray-600 uppercase">Live Agent</span>
                    </div>
                    <button onClick={() => navigate('/live')} className="text-gray-400 hover:text-blue-500">
                        <Maximize2 size={14} />
                    </button>
                </div>

                {/* Status Visualization */}
                <div className={`w-full h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isSpeaking 
                    ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                    : 'bg-[#e0e5ec] shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]'
                }`}>
                    {isSpeaking ? (
                        <div className="flex gap-1">
                            <div className="w-1 h-4 bg-white animate-[bounce_1s_infinite]"></div>
                            <div className="w-1 h-6 bg-white animate-[bounce_1s_infinite_0.1s]"></div>
                            <div className="w-1 h-4 bg-white animate-[bounce_1s_infinite_0.2s]"></div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                            <Monitor size={14} /> Watching...
                        </div>
                    )}
                </div>

                {/* Actions */}
                <NeuroButton 
                    onClick={disconnect}
                    className="w-full !py-2 !px-3 text-xs text-red-500 flex items-center justify-center gap-2"
                >
                    <MicOff size={14} /> Stop Session
                </NeuroButton>
            </div>
        </div>
    );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connected } = useLiveAgent();

  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 md:p-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <NeuroCard className="h-full sticky top-8 flex flex-col z-20">
          <div className="mb-8 text-center">
             <h1 className="text-2xl font-bold text-gray-700 tracking-tighter">NEURO<span className="text-blue-500">VOUCHER</span></h1>
             <p className="text-xs text-gray-400 mt-1">AI-Powered Finance</p>
          </div>
          
          <nav className="flex-1">
            <SidebarItem to="/" icon={BarChart2} label="Dashboard" />
            <SidebarItem to="/voucher" icon={FileText} label="Generator" />
            <SidebarItem to="/vouchers" icon={ClipboardList} label="History" />
            <SidebarItem to="/lhdn-letter" icon={ScrollText} label="LHDN Letter" />
            <SidebarItem to="/chat" icon={MessageSquare} label="AI Advisor" />
            
            {/* Live Agent Item with requested Indicators */}
            <SidebarItem 
                to="/live" 
                icon={Mic} 
                label="Live Agent" 
                extra={
                    <div className="group relative ml-auto">
                        <div className={`w-3 h-3 rounded-full shadow-inner border border-white/50 transition-colors duration-500 ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></div>
                        
                        {/* Hover Tooltip as requested */}
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-gray-800 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                            {connected ? 'Live Agent is Live' : 'Agent Offline'}
                            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-800 rotate-45"></div>
                        </div>
                    </div>
                }
            />
            
            <SidebarItem to="/editor" icon={ImageIcon} label="Receipt Editor" />
          </nav>

          <div className="mt-auto pt-4 border-t border-gray-300/20 space-y-4">
            <SidebarItem to="/settings" icon={Settings} label="Settings" />
            <div className="text-xs text-center text-gray-500 font-mono opacity-60">
                V.0.1.28 DeckerGUI Ecosystem
            </div>
          </div>
        </NeuroCard>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 relative">
        {children}
        <FloatingAgentWidget />
        <AIFocusOverlay />
      </main>
    </div>
  );
};