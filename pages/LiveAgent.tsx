import React from 'react';
import { TunaiCard, TunaiButton } from '../components/TunaiComponents';
import { Mic, MicOff, Radio, Activity, Monitor, AlertTriangle } from 'lucide-react';
import { useLiveAgent } from '../contexts/LiveAgentContext';
import { useLanguage } from '../contexts/LanguageContext';

export const LiveAgent: React.FC = () => {
  const { connected, isConnecting, isSpeaking, logs, connect, disconnect } = useLiveAgent();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 max-w-2xl mx-auto">
        <TunaiCard className="w-full text-center py-12 px-8 relative overflow-hidden">
            {connected && (
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-xl border border-red-100 shadow-sm animate-pulse">
                        <Radio className="text-red-500" size={14} />
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Live</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
                        <Monitor className="text-blue-500" size={14} />
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">Screen Shared</span>
                    </div>
                </div>
            )}
            
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-500 relative ${
                connected 
                ? isSpeaking 
                    ? 'shadow-[0_0_50px_rgba(59,130,246,0.6)] bg-blue-500 scale-110' 
                    : 'shadow-[inset_6px_6px_12px_rgba(163,177,198,0.6),inset_-6px_-6px_12px_rgba(255,255,255,0.5)] bg-[#e0e5ec]'
                : 'bg-[#e0e5ec] shadow-[9px_9px_16px_rgba(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]'
            }`}>
                 {connected ? (
                     <Activity size={48} className={isSpeaking ? "text-white animate-bounce" : "text-blue-500"} />
                 ) : (
                     <MicOff size={48} className={isConnecting ? "text-blue-400 animate-pulse" : "text-gray-400"} />
                 )}
                 
                 {isConnecting && (
                     <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                 )}
            </div>

            <h2 className="mt-8 text-2xl font-bold text-gray-700">
                {isConnecting ? t('establishingLink') : connected ? (isSpeaking ? t('speaking') : t('listening')) : t('startSession')}
            </h2>
            
            <div className="mt-4 max-w-md mx-auto">
                 <p className="text-sm text-gray-500 leading-relaxed">
                    {connected 
                     ? "The agent can now see your screen! Navigate to 'Generator' or 'LHDN Letter' tabs. The agent will hover in the corner to assist you."
                     : "Connect to enable hands-free navigation, form filling, and visual assistance across the entire app."}
                 </p>
            </div>

            <div className="mt-8">
                {!connected ? (
                    <TunaiButton onClick={connect} disabled={isConnecting} className="flex items-center gap-2 mx-auto text-blue-600 min-w-[200px] justify-center">
                        <Mic size={20} className={isConnecting ? "animate-spin" : ""} /> 
                        {isConnecting ? "Connecting..." : t('connect')}
                    </TunaiButton>
                ) : (
                    <TunaiButton onClick={disconnect} className="flex items-center gap-2 mx-auto text-red-600 min-w-[200px] justify-center">
                         <MicOff size={20} /> {t('endSession')}
                    </TunaiButton>
                )}
            </div>
        </TunaiCard>

        {/* Instructions Card */}
        <TunaiCard className="w-full opacity-90">
             <div className="flex items-start gap-4">
                 <div className="p-3 bg-blue-100/50 rounded-xl text-blue-600">
                     <Monitor size={24} />
                 </div>
                 <div>
                     <h4 className="font-bold text-gray-700 text-sm mb-1">{t('spatialAwareness')}</h4>
                     <p className="text-xs text-gray-500 leading-relaxed mb-2">
                        This session captures your screen content securely to provide context. 
                        Try asking: 
                     </p>
                     <ul className="text-xs text-blue-600 space-y-1 list-disc ml-4 font-medium">
                         <li>"Look at this receipt and fill in the voucher form."</li>
                         <li>"Read the LHDN letter preview and suggest changes."</li>
                         <li>"What is missing from this form?"</li>
                     </ul>
                 </div>
             </div>
        </TunaiCard>

        <div className="w-full text-left opacity-70">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Activity size={12} /> {t('liveLogs')}
            </h4>
            <div className="bg-[#e0e5ec] p-3 rounded-xl shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)] font-mono text-[10px] text-gray-500 space-y-1 max-h-32 overflow-y-auto border border-gray-200/50">
                {logs.length === 0 && <span className="opacity-50">System ready. Waiting for connection...</span>}
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    </div>
  );
};
