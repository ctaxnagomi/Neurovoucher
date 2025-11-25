import React from 'react';
import { NavLink } from 'react-router-dom';
import { NeuroButton, NeuroCard } from './NeuroComponents';
import { Mic, FileText, MessageSquare, Image as ImageIcon, BarChart2, ClipboardList, Settings, ScrollText } from 'lucide-react';
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

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connected } = useLiveAgent();

  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 md:p-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <NeuroCard className="h-full sticky top-8 flex flex-col">
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
            
            {/* Live Agent Item with Status Indicator */}
            <SidebarItem 
                to="/live" 
                icon={Mic} 
                label="Live Agent" 
                extra={
                    <div className="group relative">
                        <div className={`w-3 h-3 rounded-full shadow-inner border border-white/50 ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></div>
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                            {connected ? 'Live Agent is Active' : 'Agent Offline'}
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
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
};