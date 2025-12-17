import React, { useState, useEffect } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroBadge } from '../components/NeuroComponents';
import { getApiKey, setStoredApiKey, validateConnection } from '../services/geminiService';
import { Save, CheckCircle2, XCircle, Key, Activity, ScanLine, Image as ImageIcon, ShieldCheck, HelpCircle, MessageCircle, Github, HeartHandshake, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { t } = useLanguage();

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

  const ServiceStatus = ({ label, icon: Icon, description, fallback }: { label: string, icon: any, description: string, fallback?: string }) => (
    <div className="flex items-center justify-between p-4 bg-white/40 rounded-xl border border-white/60">
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                <Icon size={20} />
            </div>
            <div>
                <h4 className="font-bold text-gray-700">{label}</h4>
                <p className="text-xs text-gray-500">{description}</p>
                {fallback && <p className="text-[10px] text-orange-500 italic mt-0.5">{fallback}</p>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {loading ? (
                <span className="text-xs text-gray-400 animate-pulse">Checking...</span>
            ) : isConnected ? (
                <NeuroBadge color="text-green-600 bg-green-100/50">{t('active')}</NeuroBadge>
            ) : (
                <NeuroBadge color="text-red-500 bg-red-100/50">{t('inactive')}</NeuroBadge>
            )}
        </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-gray-700">{t('settings')}</h2>
                <p className="text-sm text-gray-500">Configure your API keys and service integrations.</p>
            </div>
            
            {/* FAQ Hotspot Icon */}
            <div className="relative group cursor-help">
                <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-blue-500 border border-blue-100 transition-transform hover:scale-110">
                    <HelpCircle size={20} />
                </div>
                <div className="absolute right-full top-0 mr-3 w-64 bg-gray-800 text-white p-3 rounded-xl text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-20">
                    <strong className="block mb-1 text-blue-300">Need Help?</strong>
                    Hover over any configuration field to see detailed tooltips. API Keys are required for all Gemini 2.5 and 3.0 Pro features.
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
                {/* API Key Configuration */}
                <NeuroCard title={t('generalApiConfig')}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                                <Key size={14} /> {t('apiKeyLabel')}
                            </label>
                            <p className="text-xs text-gray-400 mb-3">
                                {t('apiKeyDesc')}
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
                                {loading ? 'Validating Connection...' : t('saveConnect')}
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
                
                {/* Github / Join Project Section */}
                <NeuroCard>
                     <div className="text-center space-y-3 relative">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-white mx-auto shadow-lg relative group">
                            <Github size={32} />
                            {/* "Coming Soon" Placeholder overlay */}
                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-[1px]">
                                <span className="text-[8px] font-bold text-white uppercase tracking-wider text-center leading-tight">Coming<br/>Soon</span>
                            </div>
                        </div>
                        <h4 className="font-bold text-gray-700">Interested in joining this project?</h4>
                        <p className="text-xs text-gray-500">
                            Interested on joining this project ? Send your github links here (New comer are most welcome)
                        </p>
                        <button 
                            disabled
                            className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-200 px-4 py-2 rounded-full cursor-not-allowed"
                        >
                            <Github size={14} /> Add Github cdnk icon
                        </button>
                     </div>
                </NeuroCard>
            </div>

            {/* Service Status Dashboard */}
            <div className="space-y-6">
                 <div>
                    <h3 className="text-lg font-bold text-gray-600 uppercase tracking-wider px-2 mb-4">{t('serviceStatus')}</h3>
                    
                    <div className="space-y-4">
                        <ServiceStatus 
                            label={t('ocrEngine')} 
                            icon={ScanLine} 
                            description="Gemini Flash 2.5 • For Receipt Scanning"
                        />
                        
                        <ServiceStatus 
                            label={t('liveAgent')} 
                            icon={Activity} 
                            description="Gemini 2.5 Live • Real-time Voice"
                        />
                        
                        <ServiceStatus 
                            label="Nano Banana" 
                            icon={ImageIcon} 
                            description="Gemini Flash Image • Image Cleanup & Editing"
                        />

                        <ServiceStatus 
                            label={t('advisorChat')} 
                            icon={ShieldCheck} 
                            description="Gemini 3.0 Pro • Financial Reasoning"
                            fallback="Alternative: Gemini 3.0 Pro is not available"
                        />
                    </div>
                 </div>

                 {/* Customer Support Team Section */}
                 <div>
                     <h3 className="text-lg font-bold text-gray-600 uppercase tracking-wider px-2 mb-4 flex items-center gap-2">
                        <MessageCircle size={18} className="text-blue-500" /> Customer Support Team
                     </h3>
                     <div className="bg-[#e0e5ec] rounded-2xl p-4 border border-white/50 shadow-inner grid grid-cols-2 gap-4">
                         {[
                             { name: 'Sarah', status: 'online', color: 'bg-green-500' },
                             { name: 'David', status: 'busy', color: 'bg-orange-500' },
                             { name: 'Aisha', status: 'online', color: 'bg-green-500' },
                             { name: 'Marcus', status: 'offline', color: 'bg-red-500' }
                         ].map((agent, i) => (
                             <div key={i} className="flex items-center gap-3 bg-white/40 p-2 rounded-xl border border-white/60">
                                 <div className="relative">
                                     <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                         {agent.name[0]}
                                     </div>
                                     <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${agent.color}`}></div>
                                 </div>
                                 <div>
                                     <div className="text-xs font-bold text-gray-700">{agent.name}</div>
                                     <div className="text-[10px] text-gray-500 capitalize">{agent.status}</div>
                                 </div>
                             </div>
                         ))}
                         <div className="col-span-2 text-center pt-2 border-t border-gray-200/50 mt-2">
                             <p className="text-[10px] text-gray-500 leading-relaxed px-4">
                                "Every Team member has their own AI Model specifically configured to notify them for real-time maintenance or bug fixing."
                             </p>
                         </div>
                     </div>
                 </div>

                 <div className="text-center mt-4">
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