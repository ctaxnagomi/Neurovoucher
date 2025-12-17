import React, { createContext, useContext, useState, useRef, ReactNode, useEffect } from 'react';
import { getLiveClient } from '../services/geminiService';
import { createPcmBlob, decodeAudioData } from '../services/audioUtils';
import { LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { useLanguage } from './LanguageContext';
import { SUPPORTED_LANGUAGES } from '../types';

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
  sendContextInfo: (text: string) => void;
}

const LiveAgentContext = createContext<LiveAgentContextType | undefined>(undefined);

// --- Tool Definitions ---

const fillVoucherTool: FunctionDeclaration = {
  name: "fill_voucher_form",
  description: "Fill in ANY field on the Voucher Generator. Use this for Company Info, Payee Details, Authorization, or Lost Receipt sections.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      // Voucher / Payee
      payee: { type: Type.STRING, description: "Name of the payee/merchant" },
      payeeIc: { type: Type.STRING, description: "Payee IC or Company Reg No" },
      voucherNo: { type: Type.STRING, description: "Voucher Number (e.g. PV-2024-001)" },
      date: { type: Type.STRING, description: "Voucher Date (YYYY-MM-DD)" },
      category: { type: Type.STRING, description: "Expense category" },
      description: { type: Type.STRING, description: "Main description" },
      preparedBy: { type: Type.STRING, description: "Name of person preparing" },
      approvedBy: { type: Type.STRING, description: "Name of person approving" },
      
      // Company Info (Header)
      companyName: { type: Type.STRING },
      companyRegNo: { type: Type.STRING },
      companyAddress: { type: Type.STRING },
      companyTel: { type: Type.STRING },
      companyEmail: { type: Type.STRING },

      // Lost Receipt Section
      originalDate: { type: Type.STRING, description: "Original expense date" },
      evidenceType: { type: Type.STRING, description: "Type of evidence (e.g. Bank Statement)" },
      evidenceRef: { type: Type.STRING, description: "Reference number for evidence" },
      lostReason: { type: Type.STRING, description: "Reason why receipt is missing" }
    }
  }
};

const addItemTool: FunctionDeclaration = {
  name: "add_voucher_item",
  description: "Add a new line item row to the voucher table.",
  parameters: {
      type: Type.OBJECT,
      properties: {
          description: { type: Type.STRING, description: "Item description" },
          amount: { type: Type.NUMBER, description: "Item cost/amount" }
      },
      required: ["description", "amount"]
  }
};

const downloadTool: FunctionDeclaration = {
    name: "download_voucher_pdf",
    description: "Trigger the download of the completed Voucher PDF.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            confirm: { type: Type.BOOLEAN }
        }
    }
}

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

const navigationTool: FunctionDeclaration = {
  name: "navigate_app",
  description: "Navigate to a different page in the application.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { 
          type: Type.STRING, 
          description: "The route path to navigate to. Options: '/' (Dashboard), '/voucher' (Generator), '/vouchers' (History), '/lhdn-letter', '/chat', '/editor', '/settings'" 
      }
    },
    required: ["path"]
  }
};

export const LiveAgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const { language } = useLanguage();
  
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
  // Captures the full screen while ignoring the agent widget to prevent visual loops
  const captureScreen = async () => {
    try {
        if (typeof html2canvas === 'undefined') {
            console.warn("html2canvas not loaded");
            return null;
        }
        
        // Capture the entire document body for full context
        const canvas = await html2canvas(document.body, { 
            scale: 0.5, // 0.5 scale for performance vs clarity balance
            logging: false,
            useCORS: true,
            ignoreElements: (element: Element) => {
                // Ignore the live agent floating widget itself to prevent infinite mirror effect
                return element.classList.contains('live-agent-widget') || element.classList.contains('ai-focus-overlay');
            }
        });
        
        const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        return base64;
    } catch (e) {
        console.error("Screen capture failed", e);
        return null;
    }
  };

  const sendContextInfo = (text: string) => {
     addLog(`Context Update: ${text}`);
  };

  const connect = async () => {
    if (connected || isConnecting) {
        console.warn("Session already active or connecting");
        return;
    }

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

      // Determine language for instructions
      const langLabel = SUPPORTED_LANGUAGES.find(l => l.code === language)?.label || 'English';

      // Initialize Session
      const sessionPromise = client.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            tools: [{ functionDeclarations: [fillVoucherTool, addItemTool, downloadTool, fillLHDNTool, navigationTool] }],
            systemInstruction: `You are TunaiCukaiMY's Compliance Officer & Live Agent.
            
            IMPORTANT: Speak in ${langLabel} for conversation.
            
            CRITICAL COMPLIANCE RULE: 
            For any tool calls (fill_voucher_form, fill_lhdn_letter), the string arguments MUST be in **English** or **Bahasa Melayu**. 
            If the user speaks another language (e.g. Cantonese) or the screen text is in another language, TRANSLATE it to English/Malay before calling the tool. This is a strict LHDN tax requirement.
            
            GOAL: Help the user complete vouchers and forms accurately.
            
            CAPABILITIES:
            1. **Vision**: You receive a screen capture every 1.5 seconds. You see exactly what the user sees. Use this for context.
            2. **Navigation**: If the user asks to go to a page or you need to see a different form, use 'navigate_app'.
            3. **Form Filling**: Use 'fill_voucher_form' or 'fill_lhdn_letter' to update fields.
            4. **Progress**: Monitor the visual progress bars or empty fields (red borders) on screen.
            
            BEHAVIOR:
            - **Be Proactive**: If you see missing fields, ask for them.
            - **Spatial Awareness**: You can refer to elements by their location (e.g., "The box on the right").
            - **Context Persistence**: Remember that the user might switch tabs. Follow them visually.
            
            Keep responses helpful, concise, and professional in ${langLabel}.`,
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
                    sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                };
                
                source.connect(processor);
                processor.connect(audioCtx.destination);
                
                inputSourceRef.current = source;
                processorRef.current = processor;

                // --- Spatial Video Streaming (Periodic Screenshots) ---
                // 1.5s interval for near real-time updates
                videoIntervalRef.current = setInterval(async () => {
                     // Check if session is still active
                     if (!audioContextRef.current) return;
                     
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
                }, 1500); 
            },
            onmessage: async (msg: LiveServerMessage) => {
                // 1. Handle Tool Calls
                if (msg.toolCall) {
                    for (const fc of msg.toolCall.functionCalls) {
                        addLog(`Tool Used: ${fc.name}`);
                        
                        if (fc.name === 'fill_voucher_form') {
                            const fields = Object.keys(fc.args as object);
                            window.dispatchEvent(new CustomEvent('tunai-ai-highlight', { detail: { fields } }));
                            window.dispatchEvent(new CustomEvent('tunai-fill-voucher', { detail: fc.args }));
                        }
                        else if (fc.name === 'add_voucher_item') {
                            window.dispatchEvent(new CustomEvent('tunai-add-item', { detail: fc.args }));
                        }
                        else if (fc.name === 'download_voucher_pdf') {
                            window.dispatchEvent(new CustomEvent('tunai-download-pdf', { detail: {} }));
                        }
                        else if (fc.name === 'fill_lhdn_letter') {
                            const fields = Object.keys(fc.args as object);
                            window.dispatchEvent(new CustomEvent('tunai-ai-highlight', { detail: { fields } }));
                            window.dispatchEvent(new CustomEvent('tunai-fill-lhdn', { detail: fc.args }));
                        }
                        else if (fc.name === 'navigate_app') {
                            const args = fc.args as any;
                            if (args.path) {
                                window.dispatchEvent(new CustomEvent('tunai-navigate', { detail: args.path }));
                            }
                        }

                        // Send success response
                        sessionPromise.then(session => session.sendToolResponse({
                            functionResponses: {
                                name: fc.name,
                                id: fc.id,
                                response: { result: "Action executed successfully on screen." }
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
                if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
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
    <LiveAgentContext.Provider value={{ connected, isConnecting, isSpeaking, logs, connect, disconnect, addLog, sendContextInfo }}>
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
