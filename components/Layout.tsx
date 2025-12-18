// [REF-002] Refactored Navigation & Live Agent Integration
// Credit : Wan Mohd Azizi (Rikayu Wilzam)

import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { TunaiButton, TunaiCard, TunaiSelect } from './TunaiComponents';
import { Mic, FileText, MessageSquare, Image as ImageIcon, BarChart2, ClipboardList, Settings, ScrollText, Radio, Monitor, MicOff, Maximize2, Cpu, Eye, Globe } from 'lucide-react';
import { useLiveAgent } from '../contexts/LiveAgentContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../types';
import logo from '../assets/tunaicukaimy-logo/tunaicukaimylogo-2trans.png';

const SidebarItem = ({ to, icon: Icon, label, extra, connected }: { to: string; icon: React.ElementType; label: string, extra?: React.ReactNode, connected?: boolean }) => (
  <NavLink to={to} className={({ isActive }: { isActive: boolean }) => `block mb-4 no-underline`}>
    {({ isActive }: { isActive: boolean }) => (
      <TunaiButton active={isActive} className="w-full flex items-center gap-3 justify-start relative group overflow-hidden transition-all duration-300">
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
      </TunaiButton>
    )}
  </NavLink>
);

const AIFocusOverlay = () => {
    const [targets, setTargets] = useState<{rect: DOMRect, label: string}[]>([]);

    useEffect(() => {
        const handleHighlight = (e: any) => {
            const fields = (e as CustomEvent).detail.fields as string[];
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

        window.addEventListener('tunai-ai-highlight' as any, handleHighlight as any);
        return () => window.removeEventListener('tunai-ai-highlight' as any, handleHighlight as any);
    }, []);

    if (targets.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] ai-focus-overlay">
            {targets.map((t: {rect: DOMRect, label: string}, i: number) => (
                <div 
                    key={i}
                    style={{
                        '--box-top': `${t.rect.top - 4}px`,
                        '--box-left': `${t.rect.left - 4}px`,
                        '--box-width': `${t.rect.width + 8}px`,
                        '--box-height': `${t.rect.height + 8}px`
                    } as React.CSSProperties}
                    className="absolute border-2 border-green-500 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all duration-300 animate-pulse ai-focus-box"
                >
                    <div className="absolute -top-6 left-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md flex items-center gap-1 shadow-sm">
                        <Cpu size={10} /> AI WRITING: {t.label}
                    </div>
                </div>
            ))}
        </div>
    );
};

// FloatingAgentWidget component maintained but style updated
const FloatingAgentWidget = () => {
    const { connected, isSpeaking, disconnect } = useLiveAgent();
    const navigate = useNavigate();
    const location = useLocation();

    // Handle AI Navigation Requests
    useEffect(() => {
        const handleNavigate = (e: any) => {
            const path = (e as CustomEvent).detail;
            if (path && path.startsWith('/')) {
                navigate(path);
            }
        };
        window.addEventListener('tunai-navigate' as any, handleNavigate as any);
        return () => window.removeEventListener('tunai-navigate' as any, handleNavigate as any);
    }, [navigate]);

    // Do not show on the Live Agent page itself to avoid duplication
    if (!connected || location.pathname === '/live') return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 duration-500 live-agent-widget">
            <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 flex flex-col items-center gap-3 w-48">
                
                {/* Header */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isSpeaking ? 'bg-blue-500 animate-bounce' : 'bg-green-500 animate-pulse'}`}></span>
                        <span className="text-xs font-bold text-slate-600 uppercase">Live Agent</span>
                    </div>
                    <button onClick={() => navigate('/live')} className="text-slate-400 hover:text-blue-500" title="Full Screen View">
                        <Maximize2 size={14} />
                    </button>
                </div>

                {/* Status Visualization */}
                <div className={`w-full h-12 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isSpeaking 
                    ? 'bg-blue-500 shadow-md' 
                    : 'bg-slate-50 border border-slate-100'
                }`}>
                    {isSpeaking ? (
                        <div className="flex gap-1">
                            <div className="w-1 h-4 bg-white animate-[bounce_1s_infinite]"></div>
                            <div className="w-1 h-6 bg-white animate-[bounce_1s_infinite_0.1s]"></div>
                            <div className="w-1 h-4 bg-white animate-[bounce_1s_infinite_0.2s]"></div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <Monitor size={14} /> Watching Screen...
                        </div>
                    )}
                </div>

                {/* Actions */}
                <TunaiButton 
                    onClick={disconnect}
                    className="w-full !py-2 !px-3 text-xs text-red-500 flex items-center justify-center gap-2 border-red-100 hover:bg-red-50"
                >
                    <MicOff size={14} /> Stop Session
                </TunaiButton>
            </div>
        </div>
    );
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { connected } = useLiveAgent();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="h-screen bg-slate-50/60 backdrop-blur-sm p-4 md:p-8 flex flex-col md:flex-row gap-4 md:gap-8 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar - Mobile: Horizontal Scroll/Compact, Desktop: Vertical Full */}
      <aside className="w-full md:w-64 flex-shrink-0 flex flex-col h-auto md:h-full transition-all duration-300">
        <TunaiCard className="h-full flex flex-col z-20 shadow-sm border-slate-200 overflow-hidden md:overflow-y-auto no-scrollbar">
          {/* Header */}
          <div className="mb-4 md:mb-6 flex flex-row md:flex-col items-center justify-between md:justify-center relative flex-shrink-0 px-2 md:px-0">
             <div className="flex items-center gap-3 md:flex-col md:gap-0">
                  <div className="w-10 h-10 md:w-16 md:h-16 md:mb-2 relative">
                    <img src={logo} alt="TunaiCukai Logo" className="w-full h-full object-contain drop-shadow-sm" />
                    {/* Global Active Indicator */}
                    {connected && (
                        <div className="absolute -top-1 -right-1">
                            <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-white"></span>
                            </span>
                        </div>
                    )}
                 </div>
                 <div className="text-left md:text-center">
                    <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">TunaiCukai<span className="text-blue-500"> MY</span></h1>
                    <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0 md:mt-1 hidden md:block">Smart Tax & Voucher System</p>
                 </div>
             </div>
             
             {/* Mobile Language Switcher (Compact) */}
             <div className="md:hidden">
                <select 
                    title="Select Language"
                    value={language}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value as any)}
                    className="bg-slate-100 border-none rounded-md py-1 px-2 text-xs font-medium text-slate-600 outline-none"
                 >
                     {SUPPORTED_LANGUAGES.map((lang: {code: any}) => (
                         <option key={lang.code} value={lang.code}>{lang.code}</option>
                     ))}
                 </select>
             </div>
          </div>
          
          {/* Desktop Language Switcher */}
          <div className="mb-6 px-1 flex-shrink-0 hidden md:block">
             <div className="relative">
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                     <Globe size={14} />
                 </div>
                <select 
                    title="Select Language"
                    value={language}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value as any)}
                    className="w-full appearance-none bg-slate-100 border-none rounded-md py-2 pl-9 pr-8 text-xs font-medium text-slate-600 cursor-pointer outline-none focus:ring-2 focus:ring-slate-950"
                 >
                     {SUPPORTED_LANGUAGES.map((lang: {code: any, flag: string, label: string}) => (
                         <option key={lang.code} value={lang.code}>
                             {lang.flag} {lang.label}
                         </option>
                     ))}
                 </select>
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                     <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                         <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                     </svg>
                 </div>
             </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto no-scrollbar flex flex-row md:flex-col gap-2 md:gap-1 pb-2 md:pb-0">
            <SidebarItem to="/" icon={BarChart2} label={t('dashboard')} connected={connected} />
            <SidebarItem to="/admin" icon={Cpu} label="Admin" connected={connected} />
            <div className="hidden md:block my-4 border-t border-slate-100"></div>
            <SidebarItem to="/voucher" icon={FileText} label={t('generator')} connected={connected} />
            <SidebarItem to="/vouchers" icon={ClipboardList} label={t('history')} connected={connected} />
            <SidebarItem to="/design-template" icon={FileText} label={t('eInvoiceConfig')} connected={connected} />
            <SidebarItem to="/lhdn-letter" icon={ScrollText} label={t('lhdnLetter')} connected={connected} />
            <SidebarItem to="/news" icon={Globe} label={t('newsUpdates')} connected={connected} />
            <div className="hidden md:block my-4 border-t border-slate-100"></div>
            <SidebarItem to="/chat" icon={MessageSquare} label={t('aiAdvisor')} connected={connected} />
            
            <SidebarItem 
                to="/live" 
                icon={Mic} 
                label={t('liveAgent')} 
                connected={connected}
                extra={
                    <div className="ml-auto flex items-center gap-2 md:flex">
                        {connected && <span className="hidden md:inline text-[10px] font-bold text-green-600 animate-pulse">ON</span>}
                        <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white transition-colors duration-500 ${connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400 hidden md:block'}`}></div>
                    </div>
                }
            />
            
            <SidebarItem to="/editor" icon={ImageIcon} label={t('receiptEditor')} connected={connected} />
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-200/60 space-y-2 flex-shrink-0 hidden md:block">
            <SidebarItem to="/settings" icon={Settings} label={t('settings')} connected={connected} />
            <div className="text-[10px] text-center text-slate-400 font-medium">
                V.2.0.0 TunaiCukai MY <br/>
                <span className="text-[8px] opacity-70">Credit : Wan Mohd Azizi (Rikayu Wilzam)</span>
                <div className="mt-2 pt-2 border-t border-slate-100/50">
                    <span className="text-[9px] block text-slate-500">Patuhi PDPA 2010 (Malaysia)</span>
                    <span className="text-[8px] opacity-60">Data Privacy & Security Priority</span>
                </div>
            </div>
          </div>
        </TunaiCard>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 relative overflow-y-auto h-full pr-0 md:pr-2 no-scrollbar">
        {children}
        <FloatingAgentWidget />
        <AIFocusOverlay />
      </main>

      {/* Background Credit (Fixed Bottom Left) */}
      <a 
        href="https://unsplash.com/photos/green-trees-on-green-grass-field-during-daytime-LsqF59OOEC0?utm_source=unsplash&utm_medium=referral&utm_content=creditShareLink" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-2 left-2 z-0 text-[10px] text-slate-500/50 hover:text-slate-700 transition-colors font-mono pointer-events-auto"
      >
        &#123;bestbackgroundoftheweek&#125; Photo by Daniel Seßler
      </a>
    </div>
  );
};