import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { NeuroButton, NeuroCard, NeuroSelect } from './NeuroComponents';
import { Mic, FileText, MessageSquare, Image as ImageIcon, BarChart2, ClipboardList, Settings, ScrollText, Radio, Monitor, MicOff, Maximize2, Cpu, Eye, Globe } from 'lucide-react';
import { useLiveAgent } from '../contexts/LiveAgentContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../types';

const SidebarItem = ({ to, icon: Icon, label, extra, connected }: { to: string; icon: any; label: string, extra?: React.ReactNode, connected?: boolean }) => (
  <NavLink to={to} className={({ isActive }) => `block mb-4 no-underline`}>
    {({ isActive }) => (
      <NeuroButton active={isActive} className="w-full flex items-center gap-3 justify-start relative group overflow-hidden transition-all duration-300">
        <div className="relative">
            <Icon size={20} className={isActive ? 'text-blue-600' : 'text-gray-500'} />
            {/* Visual Indicator: Agent Watching this Tab (Spatial Awareness) */}
            {isActive && connected && to !== '/live' && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 z-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white"></span>
                </span>
            )}
        </div>
        <span className={`flex-1 text-left ${isActive ? 'font-bold text-gray-700' : 'text-gray-600'}`}>{label}</span>
        
        {/* Context Awareness Badge (Hover) */}
        {isActive && connected && to !== '/live' && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-green-50 px-2 py-0.5 rounded-full border border-green-100 shadow-sm flex items-center gap-1 z-10">
                 <Eye size={10} className="text-green-600" />
                 <span className="text-[9px] font-bold text-green-600 uppercase tracking-tight">Watching</span>
            </div>
        )}
        
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
                // Support finding dynamic items like 'item-123-amount' or just 'description'
                const el = document.querySelector(`[name="${field}"]`) || document.querySelector(`[data-name="${field}"]`);
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
                    <div className="absolute -top-6 left-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md flex items-center gap-1 shadow-sm">
                        <Cpu size={10} /> AI WRITING: {t.label}
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
                    <button onClick={() => navigate('/live')} className="text-gray-400 hover:text-blue-500" title="Full Screen View">
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
                            <Monitor size={14} /> Watching Screen...
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
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#e0e5ec] p-4 md:p-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex-shrink-0">
        <NeuroCard className="h-full sticky top-8 flex flex-col z-20">
          <div className="mb-4 text-center relative">
             <h1 className="text-2xl font-bold text-gray-700 tracking-tighter">{t('appTitle1')}<span className="text-blue-500"> {t('appTitle2')}</span><span className="text-gray-400 font-light"> MY</span></h1>
             <p className="text-xs text-gray-400 mt-1">Smart Tax & Voucher System</p>
             
             {/* Global Active Indicator if Connected */}
             {connected && (
                 <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                     <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                     </span>
                 </div>
             )}
          </div>
          
          {/* Language Switcher */}
          <div className="mb-6 px-1">
             <div className="relative">
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                     <Globe size={14} />
                 </div>
                 <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full appearance-none bg-gray-200/50 border-none rounded-lg py-2 pl-9 pr-8 text-xs font-bold text-gray-600 cursor-pointer outline-none focus:ring-2 focus:ring-blue-200"
                 >
                     {SUPPORTED_LANGUAGES.map(lang => (
                         <option key={lang.code} value={lang.code}>
                             {lang.flag} {lang.label}
                         </option>
                     ))}
                 </select>
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                     <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                         <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                     </svg>
                 </div>
             </div>
          </div>
          
          <nav className="flex-1">
            <SidebarItem to="/" icon={BarChart2} label={t('dashboard')} connected={connected} />
            <SidebarItem to="/voucher" icon={FileText} label={t('generator')} connected={connected} />
            <SidebarItem to="/vouchers" icon={ClipboardList} label={t('history')} connected={connected} />
            <SidebarItem to="/lhdn-letter" icon={ScrollText} label={t('lhdnLetter')} connected={connected} />
            <SidebarItem to="/chat" icon={MessageSquare} label={t('aiAdvisor')} connected={connected} />
            
            {/* Live Agent Item with requested Visual Indicator */}
            <SidebarItem 
                to="/live" 
                icon={Mic} 
                label={t('liveAgent')} 
                connected={connected}
                extra={
                    <div className="ml-auto flex items-center gap-2">
                        {connected && <span className="text-[10px] font-bold text-green-600 animate-pulse">ON</span>}
                        <div className={`w-2.5 h-2.5 rounded-full shadow-inner border border-white/50 transition-colors duration-500 ${connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400'}`}></div>
                    </div>
                }
            />
            
            <SidebarItem to="/editor" icon={ImageIcon} label={t('receiptEditor')} connected={connected} />
          </nav>

          <div className="mt-auto pt-4 border-t border-gray-300/20 space-y-4">
            <SidebarItem to="/settings" icon={Settings} label={t('settings')} connected={connected} />
            <div className="text-xs text-center text-gray-500 font-mono opacity-60">
                V.2.0.0 Tunai Cukai MY
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