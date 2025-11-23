import React, { useState, useRef } from 'react';
import { NeuroCard, NeuroButton, NeuroInput, NeuroSelect } from '../components/NeuroComponents';
import { editImage } from '../services/geminiService';
import { Upload, Wand2, Download, Image as ImageIcon, Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../types';

export const ReceiptEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [enableTranslation, setEnableTranslation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!image) return;
    setLoading(true);
    
    // Construct Prompt
    let finalPrompt = prompt;
    if (!finalPrompt) {
        finalPrompt = "Clean up this receipt image, improve contrast and readability.";
    }

    if (enableTranslation) {
        const langLabel = SUPPORTED_LANGUAGES.find(l => l.code === targetLanguage)?.label || 'English';
        finalPrompt += ` Also, strictly translate all visible text into ${langLabel}. Replace the original text with the translated text while maintaining the exact same layout, font size, and positioning.`;
    }
    
    // Extract base64 content
    const base64Data = image.split(',')[1];
    const newImage = await editImage(base64Data, finalPrompt);
    
    if (newImage) {
        setImage(newImage);
    } else {
        alert("Failed to generate image.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-gray-700">Receipt Editor</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <NeuroCard className="min-h-[500px] flex items-center justify-center relative overflow-hidden bg-gray-200/50">
                    {image ? (
                        <img src={image} alt="Receipt" className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg" />
                    ) : (
                        <div className="text-center text-gray-400">
                            <ImageIcon size={64} className="mx-auto mb-4 opacity-50" />
                            <p>Upload a receipt image to start editing</p>
                        </div>
                    )}
                    
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                            <div className="flex flex-col items-center">
                                <Wand2 className="animate-spin text-purple-600 mb-2" size={48} />
                                <span className="font-bold text-purple-700">Processing with Gemini Flash Image...</span>
                            </div>
                        </div>
                    )}
                </NeuroCard>
            </div>

            <div className="space-y-6">
                <NeuroCard title="Upload">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*"
                    />
                    <NeuroButton onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2">
                        <Upload size={18} /> Select Image
                    </NeuroButton>
                </NeuroCard>

                <NeuroCard title="AI Edit & Translate">
                    <p className="text-sm text-gray-500 mb-4">
                        Clean up stains, improve contrast, or translate text while preserving layout.
                    </p>
                    
                    <div className="space-y-4">
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Editor Prompt</label>
                             <NeuroInput 
                                placeholder="e.g., 'Remove the coffee stain'"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                        </div>

                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={enableTranslation}
                                        onChange={(e) => setEnableTranslation(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="font-medium">Enable Translation</span>
                                </label>
                                <Languages size={16} className="text-blue-500" />
                            </div>
                            
                            {enableTranslation && (
                                <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
                                    <label className="block text-xs text-gray-500 mb-1">Target Language</label>
                                    <NeuroSelect 
                                        value={targetLanguage} 
                                        onChange={(e) => setTargetLanguage(e.target.value)}
                                        className="!py-2 !text-sm"
                                    >
                                        {SUPPORTED_LANGUAGES.map(lang => (
                                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                                        ))}
                                    </NeuroSelect>
                                </div>
                            )}
                        </div>

                        <NeuroButton 
                            onClick={handleEdit} 
                            disabled={!image || loading}
                            className="w-full flex items-center justify-center gap-2 text-purple-600"
                        >
                            <Wand2 size={18} /> {enableTranslation ? 'Generate & Translate' : 'Generate Edit'}
                        </NeuroButton>
                    </div>
                </NeuroCard>
                
                 {image && (
                    <NeuroCard>
                        <NeuroButton className="w-full flex items-center justify-center gap-2 text-green-600">
                            <Download size={18} /> Download Result
                        </NeuroButton>
                    </NeuroCard>
                 )}
            </div>
        </div>
    </div>
  );
};