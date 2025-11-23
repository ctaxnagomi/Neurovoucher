import React, { useState, useEffect } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroBadge } from '../components/NeuroComponents';
import { getApiKey, setStoredApiKey, validateConnection } from '../services/geminiService';
import { Save, CheckCircle2, XCircle, Key, Activity, ScanLine, Image as ImageIcon, ShieldCheck } from 'lucide-react';

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const key = getApiKey();
    if (key) {
        setApiKey(key);
        checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    const valid = await validateConnection();
    setIsConnected(valid);
    setLoading(false);
  };

  const handleSave = async () => {
    setStoredApiKey(apiKey);
    await checkConnection();
  };

  const ServiceStatus = ({ label, icon: Icon, description }: { label: string, icon: any, description: string }) => (
    <div className="flex items-center justify-between p-4 bg-white/40 rounded-xl border border-white/60">
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                <Icon size={20} />
            </div>
            <div>
                <h4 className="font-bold text-gray-700">{label}</h4>
                <p className="text-xs text-gray-500">{description}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {loading ? (
                <span className="text-xs text-gray-400 animate-pulse">Checking...</span>
            ) : isConnected ? (
                <NeuroBadge color="text-green-600 bg-green-100/50">Active</NeuroBadge>
            ) : (
                <NeuroBadge color="text-red-500 bg-red-100/50">Inactive</NeuroBadge>
            )}
        </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-gray-700">Settings</h2>
            <p className="text-sm text-gray-500">Configure your API keys and service integrations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
                {/* API Key Configuration */}
                <NeuroCard title="General API Configuration">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                                <Key size={14} /> Google Gemini API Key
                            </label>
                            <p className="text-xs text-gray-400 mb-3">
                                This master key enables all AI features including OCR, Live Agent, and Image Editing.
                            </p>
                            <div className="relative">
                                <NeuroInput 
                                    type={showKey ? "text" : "password"} 
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter your AI Studio API Key"
                                    className="pr-12"
                                />
                                <button 
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-blue-500"
                                >
                                    {showKey ? "HIDE" : "SHOW"}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <NeuroButton 
                                onClick={handleSave} 
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 text-blue-600"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Save size={18} />
                                )}
                                {loading ? 'Validating Connection...' : 'Save & Connect'}
                            </NeuroButton>
                        </div>

                        {isConnected !== null && (
                            <div className={`flex items-center gap-2 text-sm justify-center p-2 rounded-lg ${isConnected ? 'bg-green-100/50 text-green-700' : 'bg-red-100/50 text-red-600'}`}>
                                {isConnected ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                <span>{isConnected ? "System Online & Ready" : "Connection Failed. Check API Key."}</span>
                            </div>
                        )}
                    </div>
                </NeuroCard>

                {/* Privacy Info */}
                <NeuroCard>
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="text-purple-500 mt-1" size={24} />
                        <div>
                            <h4 className="font-bold text-gray-700 text-sm">Data Privacy</h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Your API key is stored locally in your browser. It is never sent to our servers, 
                                only directly to Google's Gemini API endpoints for processing.
                            </p>
                        </div>
                    </div>
                </NeuroCard>
            </div>

            {/* Service Status Dashboard */}
            <div className="space-y-6">
                 <h3 className="text-lg font-bold text-gray-600 uppercase tracking-wider px-2">Service Status</h3>
                 
                 <ServiceStatus 
                    label="OCR Engine" 
                    icon={ScanLine} 
                    description="Gemini Flash 2.5 • For Receipt Scanning"
                 />
                 
                 <ServiceStatus 
                    label="Live Agent" 
                    icon={Activity} 
                    description="Gemini 2.5 Live • Real-time Voice"
                 />
                 
                 <ServiceStatus 
                    label="Nano Banana" 
                    icon={ImageIcon} 
                    description="Gemini Flash Image • Image Cleanup & Editing"
                 />

                 <ServiceStatus 
                    label="Advisor Chat" 
                    icon={ShieldCheck} 
                    description="Gemini 3.0 Pro • Financial Reasoning"
                 />

                 <div className="text-center mt-8">
                    <p className="text-xs text-gray-400">
                        {isConnected 
                            ? "All systems operational. You can now use the features via the sidebar." 
                            : "Services are currently offline. Please provide a valid API key."}
                    </p>
                 </div>
            </div>
        </div>
    </div>
  );
};