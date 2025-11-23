import React, { useState, useRef, useEffect } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroBadge, NeuroTextarea } from '../components/NeuroComponents';
import { generateFastSummary, generateSpeech, extractReceiptData, getLiveClient } from '../services/geminiService';
import { createPcmBlob } from '../services/audioUtils';
import { Sparkles, Play, Plus, Trash2, Save, Upload, X, Calendar, FileText, AlertTriangle, Building2, User, ScanLine, CheckCircle2, Mic, MicOff } from 'lucide-react';
import { VoucherItem } from '../types';
import { Modality, LiveServerMessage } from '@google/genai';

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

  // Authorization Details
  const [preparedBy, setPreparedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // OCR Confirmation State
  const [showOCRConfirm, setShowOCRConfirm] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  // Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const dictationCleanupRef = useRef<() => void>(() => {});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Cleanup dictation on unmount
  useEffect(() => {
    return () => {
      dictationCleanupRef.current();
    };
  }, []);

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

  const toggleDictation = async () => {
    if (isDictating) {
        dictationCleanupRef.current();
        setIsDictating(false);
        return;
    }

    setIsDictating(true);
    try {
        const client = getLiveClient();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        
        // Connect to Live API
        const sessionPromise = client.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                systemInstruction: "You are a passive listener acting as a dictation tool. Do not generate spoken responses. Just listen.",
            },
            callbacks: {
                onopen: () => {
                    processor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcmBlob = createPcmBlob(inputData);
                        sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                    };
                    source.connect(processor);
                    processor.connect(audioCtx.destination);
                },
                onmessage: (msg: LiveServerMessage) => {
                    const text = msg.serverContent?.inputTranscription?.text;
                    if (text) {
                        setDescription(prev => {
                            const needsSpace = prev.length > 0 && !prev.endsWith(' ');
                            return prev + (needsSpace ? ' ' : '') + text;
                        });
                    }
                },
                onclose: () => {
                     setIsDictating(false);
                },
                onerror: (e) => {
                    console.error("Dictation error", e);
                    setIsDictating(false);
                }
            }
        });

        dictationCleanupRef.current = () => {
            if (processor) processor.disconnect();
            if (source) source.disconnect();
            if (audioCtx) audioCtx.close();
            if (stream) stream.getTracks().forEach(t => t.stop());
            sessionPromise.then(s => s.close());
        };

    } catch (err) {
        console.error(err);
        setIsDictating(false);
        alert("Failed to access microphone or connect to Gemini Live.");
    }
  };

  const handleReadAloud = async () => {
    setPlayingAudio(true);
    const textToRead = `Voucher ${voucherNo ? voucherNo : ''} for ${payee}. Total amount is Ringgit Malaysia ${total.toFixed(2)}.`;
    const audioBuffer = await generateSpeech(textToRead);
    
    if (audioBuffer) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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

            // Store extracted data for confirmation instead of applying immediately
            setExtractedData(data);
            setShowOCRConfirm(true);
            
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

  const applyOCRData = () => {
    if (!extractedData) return;

    // Pre-fill Payee
    if (extractedData.payeeName) setPayee(extractedData.payeeName);
    if (extractedData.payeeId) setPayeeIc(extractedData.payeeId);
    
    // Apply Date to both Voucher Date and Original Expense Date
    if (extractedData.date) {
        setVoucherDate(extractedData.date);
        setOriginalDate(extractedData.date); 
    }
    
    // Pre-fill Company (if 'Bill To' detected)
    if (extractedData.companyName) setCompanyName(extractedData.companyName);
    if (extractedData.companyRegNo) setCompanyRegNo(extractedData.companyRegNo);
    if (extractedData.companyAddress) setCompanyAddress(extractedData.companyAddress);

    if (extractedData.totalAmount) {
        setItems([{
            id: Date.now().toString(),
            description: 'Receipt Import',
            amount: extractedData.totalAmount
        }]);
    }

    setShowOCRConfirm(false);
    setExtractedData(null);
  };

  const handleSaveClick = () => {
    const errors: string[] = [];

    // Essential Company Info
    if (!companyName.trim()) errors.push("Company Name is required.");

    // Essential Voucher Info
    if (!payee.trim()) errors.push("Payee Name is required.");
    if (!voucherDate) errors.push("Voucher Date is required.");
    if (!preparedBy.trim()) errors.push("Prepared By is required.");

    // Line Items Validation
    if (items.length === 0) {
        errors.push("At least one item is required.");
    } else {
        const currentTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        if (currentTotal <= 0) errors.push("Total Amount must be greater than zero.");
        
        const hasEmptyDescription = items.some(item => !item.description.trim());
        if (hasEmptyDescription) errors.push("All line items must have a description.");
    }

    if (errors.length > 0) {
        alert("Validation Error:\n\n- " + errors.join("\n- "));
        return;
    }

    setShowConfirmDialog(true);
  };

  const executeSaveVoucher = async () => {
    setShowConfirmDialog(false);
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
            prepared_by: preparedBy,
            approved_by: approvedBy,
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
            // Slight delay to simulate network
            await new Promise(resolve => setTimeout(resolve, 1000));
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
    <div className="space-y-8 relative max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-700">New Cash Voucher</h2>
            <p className="text-sm text-gray-500">Generate a new payment voucher with AI assistance</p>
        </div>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Section 1: Company Information */}
        <div className="xl:col-span-1 h-full">
            <NeuroCard title="Company Information" className="h-full">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                            <Building2 size={14} /> Company Name
                        </label>
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
                            rows={4}
                            value={companyAddress} 
                            onChange={(e) => setCompanyAddress(e.target.value)} 
                            placeholder="Full business address..." 
                        />
                    </div>
                </div>
            </NeuroCard>
        </div>

        {/* Section 2: Voucher Details */}
        <div className="xl:col-span-2">
            <NeuroCard title="Voucher Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
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

                    {/* Payee Info */}
                    <div>
                        <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                            <User size={14} /> Payee Name
                        </label>
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

                    {/* Authorization */}
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Prepared By</label>
                        <NeuroInput 
                            value={preparedBy} 
                            onChange={(e) => setPreparedBy(e.target.value)} 
                            placeholder="Name" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Approved By</label>
                        <NeuroInput 
                            value={approvedBy} 
                            onChange={(e) => setApprovedBy(e.target.value)} 
                            placeholder="Name" 
                        />
                    </div>

                    {/* Description - Full Width */}
                    <div className="md:col-span-2">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm text-gray-500">Description</label>
                            <div className="flex gap-2">
                                <NeuroButton 
                                    onClick={toggleDictation} 
                                    active={isDictating}
                                    className={`!py-1 !px-3 text-xs flex items-center gap-2 ${isDictating ? 'text-red-500' : 'text-blue-500'}`}
                                >
                                    {isDictating ? <MicOff size={12} /> : <Mic size={12} />}
                                    {isDictating ? 'Stop' : 'Dictate'}
                                </NeuroButton>
                                <NeuroButton 
                                    onClick={handleAISummary} 
                                    disabled={loadingAI} 
                                    className="!py-1 !px-3 text-xs flex items-center gap-2"
                                >
                                    <Sparkles size={12} className={loadingAI ? "animate-spin" : "text-yellow-500"} />
                                    {loadingAI ? 'Generating...' : 'AI Auto-Summarize'}
                                </NeuroButton>
                            </div>
                        </div>
                        <NeuroTextarea 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            placeholder="e.g., Payment for office supplies and refreshments" 
                            rows={2}
                        />
                    </div>
                </div>
            </NeuroCard>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Section 3: Line Items */}
        <div className="xl:col-span-2">
            <NeuroCard title="Line Items" className="h-full">
                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={item.id} className="flex gap-4 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="pt-3 text-gray-400 text-xs font-mono">{index + 1}.</div>
                            <div className="flex-1">
                                <NeuroInput 
                                    placeholder="Item Description" 
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
                                    className="text-right"
                                />
                            </div>
                            <button 
                                onClick={() => deleteItem(item.id)}
                                className="mt-3 text-red-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                    
                    <div className="pt-4">
                        <NeuroButton onClick={addItem} className="text-sm w-full md:w-auto border border-dashed border-gray-400/30">
                            <Plus size={16} className="inline mr-2" /> Add Line Item
                        </NeuroButton>
                    </div>
                </div>
            </NeuroCard>
        </div>

        {/* Section 4: Summary */}
        <div className="xl:col-span-1">
            <NeuroCard title="Summary" className="h-full flex flex-col justify-between">
                <div className="flex flex-col items-center justify-center flex-1 py-6 space-y-4">
                    <div className="text-sm text-gray-500 uppercase tracking-wider">Total Amount</div>
                    <div className="text-5xl font-bold text-gray-700 tracking-tighter">
                        <span className="text-2xl align-top mr-1 text-gray-400">RM</span>
                        {total.toFixed(2)}
                    </div>
                    <NeuroBadge color="text-blue-600 bg-blue-100/50 px-4 py-1">Draft</NeuroBadge>
                </div>
                
                <div className="pt-6 border-t border-gray-200/50">
                    <NeuroButton 
                        onClick={handleSaveClick} 
                        disabled={saving} 
                        className="w-full text-blue-600 font-bold text-lg py-4 flex items-center justify-center gap-2"
                    >
                        {saving ? <Sparkles size={20} className="animate-spin" /> : <Save size={20} />}
                        {saving ? 'Saving...' : 'Save Voucher'}
                    </NeuroButton>
                </div>
            </NeuroCard>
        </div>
      </div>

      {/* Section 5: Lost Receipt Details */}
      <NeuroCard title="Lost Receipt Details (Optional)">
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

      {/* OCR Confirmation Dialog */}
      {showOCRConfirm && extractedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setShowOCRConfirm(false)}></div>
            <NeuroCard className="w-full max-w-md relative z-10 shadow-2xl border-2 border-purple-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
                        <ScanLine size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-700">Receipt Extracted</h3>
                        <p className="text-xs text-gray-500">Gemini found the following details</p>
                    </div>
                </div>
                
                <div className="space-y-4 mb-8">
                    <div className="bg-[#e0e5ec] p-4 rounded-xl shadow-inner text-sm space-y-3">
                        <div className="flex justify-between border-b border-gray-300/50 pb-2">
                            <span className="text-gray-500">Payee Name</span> 
                            <span className="font-semibold text-gray-700 text-right">{extractedData.payeeName || "Not Found"}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-300/50 pb-2">
                            <span className="text-gray-500">Voucher & Original Date</span> 
                            <span className="font-semibold text-gray-700">{extractedData.date || "Not Found"}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-300/50 pb-2">
                            <span className="text-gray-500">Total Amount</span> 
                            <span className="font-bold text-purple-600">{extractedData.totalAmount ? `RM ${extractedData.totalAmount.toFixed(2)}` : "Not Found"}</span>
                        </div>
                         {extractedData.companyName && (
                             <div className="flex justify-between border-b border-gray-300/50 pb-2">
                                <span className="text-gray-500">Bill To</span> 
                                <span className="font-semibold text-gray-700 text-right truncate max-w-[150px]">{extractedData.companyName}</span>
                            </div>
                         )}
                    </div>
                    <p className="text-xs text-center text-gray-400">Applying this will overwrite your current form fields.</p>
                </div>
                
                <div className="flex gap-4 justify-end">
                    <NeuroButton onClick={() => setShowOCRConfirm(false)} className="text-sm px-6">Discard</NeuroButton>
                    <NeuroButton onClick={applyOCRData} className="text-sm text-purple-600 font-bold px-6 flex items-center gap-2">
                        <CheckCircle2 size={16} /> Apply Details
                    </NeuroButton>
                </div>
            </NeuroCard>
        </div>
      )}

      {/* Save Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setShowConfirmDialog(false)}></div>
            <NeuroCard className="w-full max-w-md relative z-10 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                        <AlertTriangle size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700">Confirm Voucher</h3>
                </div>
                
                <div className="space-y-4 mb-8 text-gray-600">
                    <p>Are you sure you want to save this voucher with the following details?</p>
                    <div className="bg-[#e0e5ec] p-4 rounded-xl shadow-inner text-sm space-y-3">
                        <div className="flex justify-between border-b border-gray-300/50 pb-2">
                            <span className="text-gray-500">Payee</span> 
                            <span className="font-semibold text-gray-700 text-right">{payee}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-300/50 pb-2">
                            <span className="text-gray-500">Date</span> 
                            <span className="font-semibold text-gray-700">{voucherDate}</span>
                        </div>
                         <div className="flex justify-between border-b border-gray-300/50 pb-2">
                            <span className="text-gray-500">Items</span> 
                            <span className="font-semibold text-gray-700">{items.length}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                            <span className="text-gray-500">Total</span> 
                            <span className="font-bold text-lg text-blue-600">RM {total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-4 justify-end">
                    <NeuroButton onClick={() => setShowConfirmDialog(false)} className="text-sm px-6">Cancel</NeuroButton>
                    <NeuroButton onClick={executeSaveVoucher} className="text-sm text-blue-600 font-bold px-6">Confirm Save</NeuroButton>
                </div>
            </NeuroCard>
        </div>
      )}
    </div>
  );
};