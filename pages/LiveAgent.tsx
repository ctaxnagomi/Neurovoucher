import React from 'react';
import { NeuroCard, NeuroButton } from '../components/NeuroComponents';
import { Mic, MicOff, Radio, Activity, Monitor } from 'lucide-react';
import { useLiveAgent } from '../contexts/LiveAgentContext';

export const LiveAgent: React.FC = () => {
  const { connected, isSpeaking, logs, connect, disconnect } = useLiveAgent();

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 max-w-2xl mx-auto">
        <NeuroCard className="w-full text-center py-12 px-8 relative overflow-hidden">
            {connected && (
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-lg border border-red-100 animate-pulse">
                        <Radio className="text-red-500" size={16} />
                        <span className="text-[10px] font-bold text-red-500 uppercase">Live</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg border border-blue-100">
                        <Monitor className="text-blue-500" size={16} />
                        <span className="text-[10px] font-bold text-blue-500 uppercase">Screen Shared</span>
                    </div>
                </div>
            )}
            
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${
                connected 
                ? isSpeaking 
                    ? 'shadow-[0_0_50px_rgba(59,130,246,0.6)] bg-blue-500' 
                    : 'shadow-[inset_6px_6px_12px_rgba(163,177,198,0.6),inset_-6px_-6px_12px_rgba(255,255,255,0.5)] bg-[#e0e5ec]'
                : 'bg-[#e0e5ec] shadow-[9px_9px_16px_rgba(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]'
            }`}>
                 {connected ? (
                     <Activity size={48} className={isSpeaking ? "text-white animate-bounce" : "text-blue-500"} />
                 ) : (
                     <MicOff size={48} className="text-gray-400" />
                 )}
            </div>

            <h2 className="mt-8 text-2xl font-bold text-gray-700">
                {connected ? (isSpeaking ? "Gemini is speaking..." : "Listening...") : "Start Voice Session"}
            </h2>
            <p className="mt-2 text-gray-500">
                The agent can now see your screen! Navigate to "Generator" and ask it to fill in details for you.
            </p>

            <div className="mt-8">
                {!connected ? (
                    <NeuroButton onClick={connect} className="flex items-center gap-2 mx-auto text-blue-600">
                        <Mic size={20} /> Connect Live Agent
                    </NeuroButton>
                ) : (
                    <NeuroButton onClick={disconnect} className="flex items-center gap-2 mx-auto text-red-600">
                         <MicOff size={20} /> End Session
                    </NeuroButton>
                )}
            </div>
        </NeuroCard>

        <div className="w-full text-left opacity-70">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Live Logs</h4>
            <div className="font-mono text-xs text-gray-500 space-y-1 max-h-40 overflow-y-auto">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    </div>
  );
};