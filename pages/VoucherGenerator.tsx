import React, { useState } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroBadge } from '../components/NeuroComponents';
import { generateFastSummary, generateSpeech } from '../services/geminiService';
import { Sparkles, Play, Plus, Trash2, Save } from 'lucide-react';
import { VoucherItem } from '../types';

export const VoucherGenerator: React.FC = () => {
  const [payee, setPayee] = useState('');
  const [items, setItems] = useState<VoucherItem[]>([
    { id: '1', description: '', amount: 0 }
  ]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', amount: 0 }]);
  };

  const updateItem = (id: string, field: keyof VoucherItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleAISummary = async () => {
    if (items.length === 0) return;
    setLoadingAI(true);
    // Use Fast Lite for low latency summary
    const prompt = `Summarize these expense items for a formal payment voucher description. Keep it under 15 words. Items: ${items.map(i => i.description).join(', ')}`;
    const summary = await generateFastSummary(prompt);
    
    // Add summary as a note or alert
    alert(`AI Suggested Summary: ${summary}`);
    setLoadingAI(false);
  };

  const handleReadAloud = async () => {
    setPlayingAudio(true);
    const textToRead = `Voucher for ${payee}. Total amount is Ringgit Malaysia ${total.toFixed(2)}.`;
    const audioBuffer = await generateSpeech(textToRead);
    
    if (audioBuffer) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setPlayingAudio(false);
        source.start();
    } else {
        setPlayingAudio(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-700">New Cash Voucher</h2>
        <div className="flex gap-3">
            <NeuroButton onClick={handleAISummary} disabled={loadingAI} className="flex items-center gap-2 text-sm">
                <Sparkles size={16} className={loadingAI ? "animate-spin" : "text-yellow-500"} />
                {loadingAI ? 'Thinking...' : 'AI Check'}
            </NeuroButton>
            <NeuroButton onClick={handleReadAloud} disabled={playingAudio} className="flex items-center gap-2 text-sm">
                <Play size={16} className={playingAudio ? "text-green-500" : "text-blue-500"} />
                {playingAudio ? 'Reading...' : 'Read Aloud'}
            </NeuroButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NeuroCard title="Payee Details">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-500 mb-2">Payee Name</label>
                    <NeuroInput value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="e.g., Ali Bin Abu" />
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-2">IC / Company No</label>
                    <NeuroInput placeholder="e.g., 880101-14-XXXX" />
                </div>
                <div>
                     <label className="block text-sm text-gray-500 mb-2">Date</label>
                     <NeuroInput type="date" />
                </div>
            </div>
        </NeuroCard>

        <NeuroCard title="Voucher Summary">
            <div className="h-full flex flex-col justify-center items-center text-center space-y-2">
                <div className="text-gray-500">Total Amount Payable</div>
                <div className="text-5xl font-bold text-gray-700 tracking-tight">
                    <span className="text-2xl align-top mr-1">RM</span>
                    {total.toFixed(2)}
                </div>
                <NeuroBadge color="text-gray-500">Draft Status</NeuroBadge>
            </div>
        </NeuroCard>
      </div>

      <NeuroCard title="Line Items">
        <div className="space-y-4">
            {items.map((item, index) => (
                <div key={item.id} className="flex gap-4 items-start">
                    <div className="flex-1">
                        <NeuroInput 
                            placeholder="Description" 
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        />
                    </div>
                    <div className="w-32">
                        <NeuroInput 
                            type="number" 
                            placeholder="0.00" 
                            value={item.amount}
                            onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => deleteItem(item.id)}
                        className="mt-3 text-red-400 hover:text-red-600 transition-colors"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            ))}
            
            <div className="pt-4 flex justify-between">
                <NeuroButton onClick={addItem} className="text-sm">
                    <Plus size={16} className="inline mr-2" /> Add Item
                </NeuroButton>
                <NeuroButton className="text-blue-600">
                    <Save size={16} className="inline mr-2" /> Save Voucher
                </NeuroButton>
            </div>
        </div>
      </NeuroCard>
    </div>
  );
};
