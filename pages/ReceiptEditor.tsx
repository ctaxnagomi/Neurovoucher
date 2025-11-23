import React, { useState, useRef } from 'react';
import { NeuroCard, NeuroButton, NeuroInput, NeuroBadge } from '../components/NeuroComponents';
import { editImage } from '../services/geminiService';
import { Upload, Wand2, Download, Image as ImageIcon } from 'lucide-react';

export const ReceiptEditor: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
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
    if (!image || !prompt) return;
    setLoading(true);
    
    // Extract base64 content
    const base64Data = image.split(',')[1];
    const newImage = await editImage(base64Data, prompt);
    
    if (newImage) {
        setImage(newImage);
    } else {
        alert("Failed to edit image.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-gray-700">Receipt Cleaner (Nano Banana)</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <NeuroCard className="min-h-[500px] flex items-center justify-center relative overflow-hidden">
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

                <NeuroCard title="AI Edit">
                    <p className="text-sm text-gray-500 mb-4">
                        Use Gemini 2.5 Flash Image ("Nano Banana") to clean up receipts, enhance text, or mask private info.
                    </p>
                    <div className="space-y-4">
                        <NeuroInput 
                            placeholder="e.g., 'Make the text high contrast', 'Remove the coffee stain'"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <NeuroButton 
                            onClick={handleEdit} 
                            disabled={!image || loading}
                            className="w-full flex items-center justify-center gap-2 text-purple-600"
                        >
                            <Wand2 size={18} /> Generate Edit
                        </NeuroButton>
                    </div>
                </NeuroCard>
                
                 {image && (
                    <NeuroCard>
                        <NeuroButton className="w-full flex items-center justify-center gap-2">
                            <Download size={18} /> Download Result
                        </NeuroButton>
                    </NeuroCard>
                 )}
            </div>
        </div>
    </div>
  );
};
