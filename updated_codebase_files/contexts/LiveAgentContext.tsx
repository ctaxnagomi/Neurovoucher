import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { getLiveClient } from '../services/geminiService';
import { createPcmBlob, decodeAudioData } from '../services/audioUtils';
import { LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';

// Declare html2canvas globally (loaded via script tag in index.html)
declare const html2canvas: any;

interface LiveAgentContextType {
  connected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  logs: string[];
  connect: () => Promise<void>;
  disconnect: () => void;
  addLog: (msg: string) => void;
}

const LiveAgentContext = createContext<LiveAgentContextType | undefined>(undefined);

// --- Tool Definitions ---

const fillVoucherTool: FunctionDeclaration = {
  name: "fill_voucher_form",
  description: "Fill in information into the Payment Voucher form. Use this when the user is on the Voucher Generator page and asks to enter data.",
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

const fillLHDNTool: FunctionDeclaration = {
  name: "fill_lhdn_letter",
  description: "Fill in information into the LHDN Explanation Letter form. Use this when the user is on the LHDN Letter Generator page.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      companyName: { type: Type.STRING, description: "Company Name" },
      regNo: { type: Type.STRING, description: "Registration Number" },
      reason: { type: Type.STRING, description: "Reason for missing receipts" },
      yearAssessment: { type: Type.STRING, description: "Year of Assessment (e.g. 2023)" },
      totalAmount: { type: Type.STRING, description: "Total amount of missing receipts" }
    }
  }
};

export const LiveAgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
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
        
        // Capture the entire document body for full context
        const canvas = await html2canvas(document.body, { 
            scale: 0.6, // Moderate scale for balance between readability and performance
            logging: false,
            useCORS: true,
            ignoreElements: (element: Element) => {
                // Ignore the live agent floating widget itself to prevent infinite mirror effect
                return element.classList.contains('live-agent-widget');
            }
        });
        
        const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        return base64;
    } catch (e) {
        console.error("Screen capture failed", e);
        return null;
    }
  };

  const connect = async () => {
    if (connected || isConnecting) return; // Strict lock

    setIsConnecting(true);
    addLog("Initializing connection...");

    try {
      const client = getLiveClient();
      // Browser permissions
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
            tools: [{ functionDeclarations: [fillVoucherTool, fillLHDNTool] }],
            systemInstruction: `You are NeuroVoucher's persistent AI Agent.
            
            CAPABILITIES:
            1. **Spatial Awareness**: You receive screenshots of the user's screen every few seconds. You can SEE what form they are looking at (Voucher Generator, LHDN Letter, etc.).
            2. **Form Filling**: You can physically fill in the forms on the screen using tools. 
               - If the user is on 'Voucher Generator', use 'fill_voucher_form'.
               - If the user is on 'LHDN Letter', use 'fill_lhdn_letter'.
            
            BEHAVIOR:
            - If the user asks you to "fill in this receipt" or "put this info in", LOOK at the screen (image input) to extract details, then CALL the appropriate tool.
            - Be concise. Keep responses short and helpful.`,
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            }
        },
        callbacks: {
            onopen: () => {
                setConnected(true);
                setIsConnecting(false);
                addLog("Live Agent Connected");
                
                // --- Audio Streaming ---
                const source = audioCtx.createMediaStreamSource(stream);
                const processor = audioCtx.createScriptProcessor(4096, 1, 1);
                
                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    // Use closure to ensure we use the correct promise
                    sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                };
                
                source.connect(processor);
                processor.connect(audioCtx.destination);
                
                inputSourceRef.current = source;
                processorRef.current = processor;

                // --- Spatial Video Streaming (Periodic Screenshots) ---
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
                }, 3000); // 3 seconds interval
            },
            onmessage: async (msg: LiveServerMessage) => {
                // 1. Handle Tool Calls
                if (msg.toolCall) {
                    for (const fc of msg.toolCall.functionCalls) {
                        addLog(`Tool Used: ${fc.name}`);
                        
                        if (fc.name === 'fill_voucher_form') {
                            window.dispatchEvent(new CustomEvent('neuro-fill-voucher', { detail: fc.args }));
                        } 
                        else if (fc.name === 'fill_lhdn_letter') {
                            window.dispatchEvent(new CustomEvent('neuro-fill-lhdn', { detail: fc.args }));
                        }

                        // Send success response
                        sessionPromise.then(session => session.sendToolResponse({
                            functionResponses: {
                                name: fc.name,
                                id: fc.id,
                                response: { result: "Action executed on screen." }
                            }
                        }));
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
                        // Only set speaking to false if no more audio is queued close by
                        if (outputContextRef.current && outputContextRef.current.currentTime >= nextStartTimeRef.current - 0.1) {
                            setIsSpeaking(false);
                        }
                    };
                }
            },
            onclose: () => {
                setConnected(false);
                setIsConnecting(false);
                addLog("Session Closed");
                if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
            },
            onerror: (err) => {
                console.error(err);
                addLog("Error: " + JSON.stringify(err));
                setConnected(false);
                setIsConnecting(false);
            }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      addLog("Failed to start session");
      setConnected(false);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    // Stop Intervals
    if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
    }

    // Stop Audio Processing
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (inputSourceRef.current) {
        inputSourceRef.current.disconnect();
        inputSourceRef.current = null;
    }
    
    // Close Audio Contexts
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (outputContextRef.current) {
        outputContextRef.current.close();
        outputContextRef.current = null;
    }

    // Close Session
    if (sessionRef.current) {
        sessionRef.current.then((s: any) => {
             if (s.close) s.close();
        }).catch((e: any) => console.error("Error closing session", e));
        sessionRef.current = null;
    }
    
    setConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    addLog("Disconnected");
  };

  return (
    <LiveAgentContext.Provider value={{ connected, isConnecting, isSpeaking, logs, connect, disconnect, addLog }}>
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
