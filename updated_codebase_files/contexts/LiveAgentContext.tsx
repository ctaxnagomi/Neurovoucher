import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { getLiveClient } from '../services/geminiService';
import { createPcmBlob, decodeAudioData } from '../services/audioUtils';
import { LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';

// Declare html2canvas globally (loaded via script tag in index.html)
declare const html2canvas: any;

interface LiveAgentContextType {
  connected: boolean;
  isSpeaking: boolean;
  logs: string[];
  connect: () => Promise<void>;
  disconnect: () => void;
  addLog: (msg: string) => void;
}

const LiveAgentContext = createContext<LiveAgentContextType | undefined>(undefined);

// Tool Definition: Allow AI to fill form fields
const fillFormTool: FunctionDeclaration = {
  name: "fill_voucher_form",
  description: "Fill in information into the voucher form fields. Use this when the user asks to enter data like payee, amount, date, or description.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      payee: { type: Type.STRING, description: "Name of the payee/merchant" },
      totalAmount: { type: Type.NUMBER, description: "Total amount of the expense" },
      date: { type: Type.STRING, description: "Date of expense (YYYY-MM-DD)" },
      description: { type: Type.STRING, description: "Description of the item/service" },
      category: { type: Type.STRING, description: "Expense category" }
    }
  }
};

export const LiveAgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Refs to maintain session across re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const videoIntervalRef = useRef<any>(null);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));

  // --- Spatial Feature: Capture Screen ---
  const captureScreen = async () => {
    try {
        if (typeof html2canvas === 'undefined') return null;
        
        // Capture specific root or body
        const canvas = await html2canvas(document.body, { 
            scale: 0.5, // Low res for speed
            logging: false,
            useCORS: true 
        });
        
        const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
        return base64;
    } catch (e) {
        console.error("Screen capture failed", e);
        return null;
    }
  };

  const connect = async () => {
    if (connected) return; // Prevent double connection

    try {
      const client = getLiveClient();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // Initialize Session
      const sessionPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            tools: [{ functionDeclarations: [fillFormTool] }],
            systemInstruction: `You are NeuroVoucher's persistent AI Agent. 
            You have 'Spatial Awareness' - you can receive screen frames to see what the user is doing. 
            You can fill in the voucher form using the 'fill_voucher_form' tool.
            If the user asks to "fill in" data, execute the tool.
            Be concise, helpful, and friendly.`,
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            }
        },
        callbacks: {
            onopen: () => {
                setConnected(true);
                addLog("Live Agent Connected & Listening");
                
                // --- Audio Streaming ---
                const source = audioCtx.createMediaStreamSource(stream);
                const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                
                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                };
                
                source.connect(processor);
                processor.connect(audioCtx.destination);
                
                inputSourceRef.current = source;
                processorRef.current = processor;

                // --- Spatial Video Streaming (Periodic Screenshots) ---
                // Send a frame every 3 seconds so AI has context
                videoIntervalRef.current = setInterval(async () => {
                     const imageBase64 = await captureScreen();
                     if (imageBase64) {
                         sessionPromise.then(session => {
                             session.sendRealtimeInput({ 
                                 media: { 
                                     mimeType: 'image/jpeg', 
                                     data: imageBase64 
                                 } 
                             });
                         });
                     }
                }, 3000);
            },
            onmessage: async (msg: LiveServerMessage) => {
                // 1. Handle Tool Calls (Form Filling)
                if (msg.toolCall) {
                    for (const fc of msg.toolCall.functionCalls) {
                        if (fc.name === 'fill_voucher_form') {
                            addLog(`Executing Tool: Filling Form...`);
                            
                            // Dispatch custom event for VoucherGenerator to listen to
                            const event = new CustomEvent('neuro-fill-form', { detail: fc.args });
                            window.dispatchEvent(event);
                            
                            // Send success response back to model
                            sessionPromise.then(session => session.sendToolResponse({
                                functionResponses: {
                                    name: fc.name,
                                    id: fc.id,
                                    response: { result: "Form updated successfully on screen." }
                                }
                            }));
                        }
                    }
                }

                // 2. Handle Audio Output
                const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (base64Audio && outputContextRef.current) {
                    setIsSpeaking(true);
                    const audioBuffer = await decodeAudioData(
                        new Uint8Array(atob(base64Audio).split('').map(c => c.charCodeAt(0))),
                        outputContextRef.current
                    );
                    
                    const source = outputContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputContextRef.current.destination);
                    
                    const startTime = Math.max(outputContextRef.current.currentTime, nextStartTimeRef.current);
                    source.start(startTime);
                    nextStartTimeRef.current = startTime + audioBuffer.duration;
                    
                    source.onended = () => {
                        if (outputContextRef.current && outputContextRef.current.currentTime >= nextStartTimeRef.current) {
                            setIsSpeaking(false);
                        }
                    };
                }
            },
            onclose: () => {
                setConnected(false);
                addLog("Session Closed");
                clearInterval(videoIntervalRef.current);
            },
            onerror: (err) => {
                console.error(err);
                addLog("Error: " + JSON.stringify(err));
                setConnected(false);
            }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      addLog("Failed to start session");
      setConnected(false);
    }
  };

  const disconnect = () => {
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
    if (outputContextRef.current) {
        outputContextRef.current.close();
        outputContextRef.current = null;
    }
    if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
    }

    if (sessionRef.current) {
        // Attempt to close properly if API supports it, otherwise connection drops
        sessionRef.current.then((s: any) => s.close && s.close());
        sessionRef.current = null;
    }
    
    setConnected(false);
    setIsSpeaking(false);
    addLog("Disconnected by user");
  };

  return (
    <LiveAgentContext.Provider value={{ connected, isSpeaking, logs, connect, disconnect, addLog }}>
      {children}
    </LiveAgentContext.Provider>
  );
};

export const useLiveAgent = () => {
  const context = useContext(LiveAgentContext);
  if (!context) {
    throw new Error('useLiveAgent must be used within a LiveAgentProvider');
  }
  return context;
};