import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { NeuroButton, NeuroCard } from './NeuroComponents';
import { Mic, FileText, MessageSquare, Image as ImageIcon, BarChart2, ClipboardList, Settings, ScrollText, Radio, Monitor, MicOff, Maximize2 } from 'lucide-react';
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

const FloatingAgentWidget = () => {
    const { connected, isSpeaking, disconnect } = useLiveAgent();
    const navigate = useNavigate();
    const location = useLocation();

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
      </main>
    </div>
  );
};
