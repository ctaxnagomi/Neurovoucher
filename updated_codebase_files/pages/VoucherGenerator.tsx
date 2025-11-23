import React, { useState, useRef } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroBadge, NeuroTextarea } from '../components/NeuroComponents';
import { generateFastSummary, generateSpeech, extractReceiptData } from '../services/geminiService';
import { Sparkles, Play, Plus, Trash2, Save, Upload, X, Calendar, FileText } from 'lucide-react';
import { VoucherItem } from '../types';

export const VoucherGenerator: React.FC = () => {
  // Voucher / Payee Details
  const [payee, setPayee] = useState('');
  const [payeeIc, setPayeeIc] = useState('');
  const [voucherDate, setVoucherDate] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [description, setDescription] = useState('');
  
  // Company Details (Issuer/Bill-To)
  const [companyName, setCompanyName] = useState('');
  const [companyRegNo, setCompanyRegNo] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  // Lost Receipt Details
  const [originalDate, setOriginalDate] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');

  const [items, setItems] = useState<VoucherItem[]>([
    { id: '1', description: '', amount: 0 }
  ]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const validItems = items.filter(i => i.description.trim().length > 0);
    if (validItems.length === 0) {
        alert("Please add item descriptions first.");
        return;
    }
    
    setLoadingAI(true);
    
    const prompt = `Summarize these expense items for a formal payment voucher description. Keep it under 15 words. Items: ${validItems.map(i => i.description).join(', ')}`;
    const summary = await generateFastSummary(prompt);
    
    setDescription(summary);
    setLoadingAI(false);
  };

  const handleReadAloud = async () => {
    setPlayingAudio(true);
    const textToRead = `Voucher ${voucherNo ? voucherNo : ''} for ${payee}. Total amount is Ringgit Malaysia ${total.toFixed(2)}.`;
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

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        try {
            const base64String = (reader.result as string).split(',')[1];
            const data = await extractReceiptData(base64String);
            
            if (!data || Object.keys(data).length === 0) {
                alert('Could not extract data from the receipt image. Please try a clearer photo.');
                setScanning(false);
                return;
            }
            
            // Pre-fill Payee
            if (data.payeeName) setPayee(data.payeeName);
            if (data.payeeId) setPayeeIc(data.payeeId);
            if (data.date) {
                setVoucherDate(data.date);
                setOriginalDate(data.date); // Assumption: Receipt date is the original date
            }
            
            // Pre-fill Company (if 'Bill To' detected)
            if (data.companyName) setCompanyName(data.companyName);
            if (data.companyRegNo) setCompanyRegNo(data.companyRegNo);
            if (data.companyAddress) setCompanyAddress(data.companyAddress);

            if (data.totalAmount) {
                setItems([{
                    id: Date.now().toString(),
                    description: 'Receipt Import',
                    amount: data.totalAmount
                }]);
            }
            
        } catch (error) {
            console.error(error);
            alert('Error processing receipt.');
        } finally {
            setScanning(false);
        }
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveVoucher = async () => {
    if (!payee || !voucherDate || items.length === 0) {
        alert("Please ensure Payee, Date, and at least one Item are filled.");
        return;
    }

    setSaving(true);

    const payload = {
        voucher_no: voucherNo || `PV-${Date.now()}`,
        voucher_date: voucherDate,
        company: {
            name: companyName,
            registration_no: companyRegNo,
            address: companyAddress
        },
        payee: {
            name: payee,
            ic_no: payeeIc
        },
        category: "General Expense",
        description: description || "General Expenses",
        items: items.map(item => ({
            description: item.description,
            amount: Number(item.amount)
        })),
        authorization: {
            prepared_by: "User", // Defaults
            approved_by: "",
            designation: ""
        },
        lost_receipt: {
            original_date: originalDate || voucherDate,
            reason: lostReason,
            evidence_type: evidenceType,
            evidence_ref: evidenceRef
        }
    };

    try {
        const response = await fetch('/api/vouchers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            alert("Voucher saved successfully!");
            // Optional: Redirect or clear form
        } else {
            console.warn("Backend API not reachable. Mocking success.");
            alert(`Voucher saved (Simulation). Data logged to console.`);
            console.log("Submitted Payload:", payload);
        }
    } catch (error) {
        console.error("Save failed:", error);
        alert("Network error. See console for details.");
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-700">New Cash Voucher</h2>
        <div className="flex gap-3">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleReceiptScan} 
            />
            <NeuroButton onClick={() => fileInputRef.current?.click()} disabled={scanning} className="flex items-center gap-2 text-sm">
                <Upload size={16} className={scanning ? "animate-bounce text-blue-500" : "text-purple-600"} />
                {scanning ? 'Analyzing...' : 'Upload Receipt'}
            </NeuroButton>
            <NeuroButton onClick={handleReadAloud} disabled={playingAudio} className="flex items-center gap-2 text-sm">
                <Play size={16} className={playingAudio ? "text-green-500" : "text-blue-500"} />
                {playingAudio ? 'Reading...' : 'Read Aloud'}
            </NeuroButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NeuroCard title="Company Details">
             <div className="space-y-4">
                <div>
                    <label className="block text-sm text-gray-500 mb-2">Company Name</label>
                    <NeuroInput 
                        value={companyName} 
                        onChange={(e) => setCompanyName(e.target.value)} 
                        placeholder="e.g., My Tech Sdn Bhd" 
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-2">Registration No.</label>
                    <NeuroInput 
                        value={companyRegNo} 
                        onChange={(e) => setCompanyRegNo(e.target.value)} 
                        placeholder="e.g., 202301000XXX" 
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-2">Address</label>
                    <NeuroTextarea 
                        rows={2}
                        value={companyAddress} 
                        onChange={(e) => setCompanyAddress(e.target.value)} 
                        placeholder="Full business address..." 
                    />
                </div>
            </div>
        </NeuroCard>

        <NeuroCard title="Voucher & Payee Details">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label className="block text-sm text-gray-500 mb-2">Voucher No.</label>
                         <div className="relative">
                            <NeuroInput 
                                value={voucherNo} 
                                onChange={(e) => setVoucherNo(e.target.value)} 
                                placeholder="PV-2024-001" 
                                className="pl-10"
                            />
                            <FileText size={18} className="absolute left-3 top-3.5 text-gray-400" />
                         </div>
                    </div>
                    <div>
                         <label className="block text-sm text-gray-500 mb-2">Voucher Date</label>
                         <div className="relative">
                            <NeuroInput 
                                type="date" 
                                value={voucherDate} 
                                onChange={(e) => setVoucherDate(e.target.value)} 
                                className="pl-10"
                            />
                            <Calendar size={18} className="absolute left-3 top-3.5 text-gray-400" />
                         </div>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm text-gray-500">Description</label>
                        <NeuroButton 
                            onClick={handleAISummary} 
                            disabled={loadingAI} 
                            className="!py-1 !px-3 text-xs flex items-center gap-2"
                        >
                            <Sparkles size={12} className={loadingAI ? "animate-spin" : "text-yellow-500"} />
                            {loadingAI ? 'Generating...' : 'AI Auto-Summarize'}
                        </NeuroButton>
                    </div>
                    <NeuroTextarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="e.g., Payment for office supplies and refreshments" 
                        rows={2}
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-500 mb-2">Payee Name</label>
                    <NeuroInput 
                        value={payee} 
                        onChange={(e) => setPayee(e.target.value)} 
                        placeholder="e.g., Ali Bin Abu" 
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-500 mb-2">IC / Company No</label>
                    <NeuroInput 
                        value={payeeIc}
                        onChange={(e) => setPayeeIc(e.target.value)}
                        placeholder="e.g., 880101-14-XXXX" 
                    />
                </div>
            </div>
        </NeuroCard>
      </div>

      <NeuroCard title="Lost Receipt Declaration (Optional)">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div>
                    <label className="block text-sm text-gray-500 mb-2">Original Expense Date</label>
                    <NeuroInput type="date" value={originalDate} onChange={(e) => setOriginalDate(e.target.value)} />
               </div>
               <div>
                    <label className="block text-sm text-gray-500 mb-2">Evidence Type</label>
                    <NeuroInput 
                        placeholder="e.g., Bank Statement" 
                        value={evidenceType}
                        onChange={(e) => setEvidenceType(e.target.value)}
                    />
               </div>
               <div>
                    <label className="block text-sm text-gray-500 mb-2">Evidence Reference</label>
                    <NeuroInput 
                        placeholder="e.g., TRX-123456" 
                        value={evidenceRef}
                        onChange={(e) => setEvidenceRef(e.target.value)}
                    />
               </div>
               <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm text-gray-500 mb-2">Reason for Lost Receipt</label>
                    <NeuroTextarea 
                        placeholder="Brief explanation for why the original receipt is missing..." 
                        value={lostReason}
                        onChange={(e) => setLostReason(e.target.value)}
                        rows={2}
                    />
               </div>
          </div>
      </NeuroCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
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
                        <NeuroButton onClick={handleSaveVoucher} disabled={saving} className="text-blue-600">
                            {saving ? <Sparkles size={16} className="animate-spin inline mr-2" /> : <Save size={16} className="inline mr-2" />}
                            {saving ? 'Saving...' : 'Save Voucher'}
                        </NeuroButton>
                    </div>
                </div>
            </NeuroCard>
        </div>

        <div className="md:col-span-1">
            <NeuroCard title="Voucher Summary" className="h-full">
                <div className="h-full flex flex-col justify-center items-center text-center space-y-2">
                    <div className="text-gray-500">Total Amount Payable</div>
                    <div className="text-4xl lg:text-5xl font-bold text-gray-700 tracking-tight">
                        <span className="text-2xl align-top mr-1">RM</span>
                        {total.toFixed(2)}
                    </div>
                    <NeuroBadge color="text-gray-500">Draft Status</NeuroBadge>
                </div>
            </NeuroCard>
        </div>
      </div>
    </div>
  );
};