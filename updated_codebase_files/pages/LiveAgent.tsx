import React, { useEffect, useRef, useState } from 'react';
import { NeuroCard, NeuroButton } from '../components/NeuroComponents';
import { getLiveClient } from '../services/geminiService';
import { createPcmBlob, decodeAudioData } from '../services/audioUtils';
import { Mic, MicOff, Radio, Activity } from 'lucide-react';
import { LiveServerMessage, Modality } from '@google/genai';

export const LiveAgent: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

  const startSession = async () => {
    try {
      const client = getLiveClient();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      // Output Audio Context (24kHz for Gemini)
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = outputCtx.currentTime;

      const sessionPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: "You are a friendly voucher processing assistant. Help the user create vouchers by voice. Keep responses short and conversational.",
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            }
        },
        callbacks: {
            onopen: () => {
                setConnected(true);
                addLog("Connected to Gemini Live");
                
                // Setup Input Stream
                const source = audioCtx.createMediaStreamSource(stream);
                const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                
                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    
                    sessionPromise.then(session => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };
                
                source.connect(processor);
                processor.connect(audioCtx.destination);
                
                inputSourceRef.current = source;
                processorRef.current = processor;
            },
            onmessage: async (msg: LiveServerMessage) => {
                // Handle Audio Output
                const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    setIsSpeaking(true);
                    const audioBuffer = await decodeAudioData(
                        new Uint8Array(atob(base64Audio).split('').map(c => c.charCodeAt(0))),
                        outputCtx
                    );
                    
                    const source = outputCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputCtx.destination);
                    
                    const startTime = Math.max(outputCtx.currentTime, nextStartTimeRef.current);
                    source.start(startTime);
                    nextStartTimeRef.current = startTime + audioBuffer.duration;
                    
                    source.onended = () => {
                        if (outputCtx.currentTime >= nextStartTimeRef.current) {
                            setIsSpeaking(false);
                        }
                    };
                }
                
                if (msg.serverContent?.turnComplete) {
                    // Turn complete logic if needed
                }
            },
            onclose: () => {
                setConnected(false);
                addLog("Session Closed");
            },
            onerror: (err) => {
                console.error(err);
                addLog("Error: " + JSON.stringify(err));
            }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      addLog("Failed to start session");
    }
  };

  const stopSession = () => {
    // Cleanup Audio
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }

    // Close Session (Not officially supported method in types yet, but standard pattern)
    // We'll just reload connection state here effectively.
    setConnected(false);
    setIsSpeaking(false);
    addLog("Session Disconnected");
    window.location.reload(); // Hard reset for audio contexts to be safe in this demo
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 max-w-2xl mx-auto">
        <NeuroCard className="w-full text-center py-12 px-8 relative overflow-hidden">
            {connected && (
                <div className="absolute top-4 right-4 animate-pulse">
                    <Radio className="text-red-500" size={24} />
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
                Use Gemini Live to dictate vouchers or ask complex finance questions hands-free.
            </p>

            <div className="mt-8">
                {!connected ? (
                    <NeuroButton onClick={startSession} className="flex items-center gap-2 mx-auto text-blue-600">
                        <Mic size={20} /> Connect Live Agent
                    </NeuroButton>
                ) : (
                    <NeuroButton onClick={stopSession} className="flex items-center gap-2 mx-auto text-red-600">
                         <MicOff size={20} /> End Session
                    </NeuroButton>
                )}
            </div>
        </NeuroCard>

        <div className="w-full text-left opacity-70">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Live Logs</h4>
            <div className="font-mono text-xs text-gray-500 space-y-1">
                {logs.map((l, i) => <div key={i}>&gt; {l}</div>)}
            </div>
        </div>
    </div>
  );
};