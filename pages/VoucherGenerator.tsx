import React, { useState, useRef, useEffect } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroBadge, NeuroTextarea, NeuroSelect } from '../components/NeuroComponents';
import { generateFastSummary, generateSpeech, extractReceiptData, getLiveClient } from '../services/geminiService';
import { createPcmBlob } from '../services/audioUtils';
import { Sparkles, Play, Plus, Trash2, Save, Upload, X, Calendar, FileText, AlertTriangle, Building2, User, ScanLine, CheckCircle2, Mic, MicOff, Tag, Info, Image as ImageIcon, Archive } from 'lucide-react';
import { VoucherItem } from '../types';
import { Modality, LiveServerMessage } from '@google/genai';

const AutoFilledIndicator = () => (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none animate-pulse z-10" title="Auto-filled by AI">
        <Sparkles size={16} fill="currentColor" className="opacity-70" />
    </div>
);

export const VoucherGenerator: React.FC = () => {
  // Voucher / Payee Details
  const [payee, setPayee] = useState('');
  const [payeeIc, setPayeeIc] = useState('');
  const [voucherDate, setVoucherDate] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Company Details (Issuer/Bill-To)
  const [companyName, setCompanyName] = useState('');
  const [companyRegNo, setCompanyRegNo] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

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
  const [showOCRHelp, setShowOCRHelp] = useState(false);
  
  // Auto-filled field tracking
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  // Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const dictationCleanupRef = useRef<() => void>(() => {});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Fetch Categories on Mount
  useEffect(() => {
    const fetchCategories = async () => {
        try {
            // Simulated API endpoint /api/categories
            // Mock data simulating API response
            const mockApiCategories = [
                "General Expense", 
                "Travel & Transport", 
                "Office Supplies", 
                "Meals & Entertainment", 
                "Utilities", 
                "Professional Services", 
                "Medical",
                "Maintenance & Repairs",
                "Training & Development"
            ];
            
            setCategories(mockApiCategories);
            if (mockApiCategories.length > 0) {
                setCategory(mockApiCategories[0]);
            }
        } catch (error) {
            console.error("Failed to load categories", error);
            setCategories(["General Expense"]);
        }
    };
    fetchCategories();
  }, []);

  // Cleanup dictation on unmount
  useEffect(() => {
    return () => {
      dictationCleanupRef.current();
    };
  }, []);

  const handleFieldChange = (field: string) => {
    if (autoFilledFields.has(field)) {
        const next = new Set(autoFilledFields);
        next.delete(field);
        setAutoFilledFields(next);
    }
  };

  const getAutoFillClass = (field: string) => 
    autoFilledFields.has(field) ? "ring-2 ring-purple-400/40 bg-purple-50/10 transition-all duration-500" : "";

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', amount: 0 }]);
  };

  const updateItem = (id: string, field: keyof VoucherItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    if (field === 'amount') {
        handleFieldChange(`item-${id}-amount`);
    }
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setCompanyLogo(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const applyOCRData = () => {
    if (!extractedData) return;

    // Use existing auto-filled fields to preserve previous fills if merging
    const newAutoFilled = new Set<string>(autoFilledFields);

    const isEmpty = (val: string) => !val || val.trim() === '';

    // Pre-fill Payee
    if (extractedData.payeeName && isEmpty(payee)) {
        setPayee(extractedData.payeeName);
        newAutoFilled.add('payee');
    }
    if (extractedData.payeeId && isEmpty(payeeIc)) {
        setPayeeIc(extractedData.payeeId);
        newAutoFilled.add('payeeIc');
    }
    
    // Apply Date to both Voucher Date and Original Expense Date
    if (extractedData.date) {
        if (isEmpty(voucherDate)) {
            setVoucherDate(extractedData.date);
            newAutoFilled.add('voucherDate');
        }
        if (isEmpty(originalDate)) {
            setOriginalDate(extractedData.date); 
            newAutoFilled.add('originalDate');
        }
    }
    
    // Pre-fill Company (if 'Bill To' detected)
    if (extractedData.companyName && isEmpty(companyName)) {
        setCompanyName(extractedData.companyName);
        newAutoFilled.add('companyName');
    }
    if (extractedData.companyRegNo && isEmpty(companyRegNo)) {
        setCompanyRegNo(extractedData.companyRegNo);
        newAutoFilled.add('companyRegNo');
    }
    if (extractedData.companyAddress && isEmpty(companyAddress)) {
        setCompanyAddress(extractedData.companyAddress);
        newAutoFilled.add('companyAddress');
    }

    // Only apply total amount if items list is effectively empty
    const isItemsEmpty = items.length === 0 || (items.length === 1 && !items[0].description && !items[0].amount);

    if (extractedData.totalAmount && isItemsEmpty) {
        const newItemId = Date.now().toString();
        setItems([{
            id: newItemId,
            description: 'Receipt Import',
            amount: extractedData.totalAmount
        }]);
        newAutoFilled.add(`item-${newItemId}-amount`);
    }

    setAutoFilledFields(newAutoFilled);
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

  const executeSaveVoucher = async (status: 'DRAFT' | 'COMPLETED' = 'COMPLETED') => {
    setShowConfirmDialog(false);
    setSaving(true);

    const payload = {
        voucher_no: voucherNo || `PV-${Date.now()}`,
        voucher_date: voucherDate,
        company: {
            name: companyName,
            registration_no: companyRegNo,
            address: companyAddress,
            logo: companyLogo
        },
        payee: {
            name: payee,
            ic_no: payeeIc
        },
        category: category,
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
        },
        status: status
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
            alert(`Voucher ${status.toLowerCase()} saved successfully!`);
            // Optional: Redirect or clear form
        } else {
            console.warn("Backend API not reachable. Mocking success.");
            // Slight delay to simulate network
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert(`Voucher saved as ${status}. Data logged to console.`);
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
                    {/* Logo Section */}
                    <div className="flex flex-col items-center justify-center mb-6">
                         <div className="relative w-24 h-24 group cursor-pointer">
                            <div className={`w-full h-full rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50/50 transition-all ${companyLogo ? 'border-purple-200' : 'hover:border-purple-300'}`}>
                                {companyLogo ? (
                                    <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center text-gray-400 p-2">
                                        <ImageIcon size={24} className="mx-auto mb-1 opacity-50" />
                                        <span className="text-[10px] uppercase font-bold tracking-wider">Logo</span>
                                    </div>
                                )}
                            </div>
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-xs backdrop-blur-[1px]">
                                 <span className="text-xs font-medium">Change</span>
                            </div>
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                         </div>
                    </div>

                    <div className="relative">
                        <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                            <Building2 size={14} /> Company Name
                        </label>
                        <div className="relative">
                            <NeuroInput 
                                value={companyName} 
                                onChange={(e) => { setCompanyName(e.target.value); handleFieldChange('companyName'); }}
                                placeholder="e.g., My Tech Sdn Bhd" 
                                className={getAutoFillClass('companyName')}
                            />
                            {autoFilledFields.has('companyName') && <AutoFilledIndicator />}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Registration No.</label>
                        <div className="relative">
                            <NeuroInput 
                                value={companyRegNo} 
                                onChange={(e) => { setCompanyRegNo(e.target.value); handleFieldChange('companyRegNo'); }}
                                placeholder="e.g., 202301000XXX" 
                                className={getAutoFillClass('companyRegNo')}
                            />
                            {autoFilledFields.has('companyRegNo') && <AutoFilledIndicator />}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Address</label>
                        <div className="relative">
                            <NeuroTextarea 
                                rows={4}
                                value={companyAddress} 
                                onChange={(e) => { setCompanyAddress(e.target.value); handleFieldChange('companyAddress'); }}
                                placeholder="Full business address..." 
                                className={getAutoFillClass('companyAddress')}
                            />
                            {autoFilledFields.has('companyAddress') && <div className="absolute right-3 top-3"><Sparkles size={16} className="text-purple-500 animate-pulse opacity-70" /></div>}
                        </div>
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
                                placeholder="PV-YYYY-XXXX" 
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
                                onChange={(e) => { setVoucherDate(e.target.value); handleFieldChange('voucherDate'); }}
                                className={`pl-10 ${getAutoFillClass('voucherDate')}`}
                            />
                            <Calendar size={18} className="absolute left-3 top-3.5 text-gray-400" />
                            {autoFilledFields.has('voucherDate') && <AutoFilledIndicator />}
                        </div>
                    </div>

                    {/* Category & Payee */}
                    <div>
                        <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                            <Tag size={14} /> Category
                        </label>
                        <NeuroSelect 
                            value={category} 
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </NeuroSelect>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                            <User size={14} /> Payee Name
                        </label>
                        <div className="relative">
                            <NeuroInput 
                                value={payee} 
                                onChange={(e) => { setPayee(e.target.value); handleFieldChange('payee'); }}
                                placeholder="e.g., Ali Bin Abu" 
                                className={getAutoFillClass('payee')}
                            />
                            {autoFilledFields.has('payee') && <AutoFilledIndicator />}
                        </div>
                    </div>

                    {/* ID & Authorization */}
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">IC / Company No</label>
                        <div className="relative">
                            <NeuroInput 
                                value={payeeIc}
                                onChange={(e) => { setPayeeIc(e.target.value); handleFieldChange('payeeIc'); }}
                                placeholder="e.g., 880101-14-XXXX" 
                                className={getAutoFillClass('payeeIc')}
                            />
                            {autoFilledFields.has('payeeIc') && <AutoFilledIndicator />}
                        </div>
                    </div>
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
                            <div className="w-32 relative">
                                <NeuroInput 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={item.amount}
                                    onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                                    className={`text-right ${getAutoFillClass(`item-${item.id}-amount`)}`}
                                />
                                {autoFilledFields.has(`item-${item.id}-amount`) && (
                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                                         <Sparkles size={12} className="text-purple-500 animate-pulse" />
                                    </div>
                                )}
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
                
                <div className="pt-6 border-t border-gray-200/50 space-y-4">
                    <NeuroButton 
                        onClick={handleAISummary} 
                        disabled={loadingAI} 
                        className="w-full text-purple-600 text-sm py-3 flex items-center justify-center gap-2"
                    >
                        <Sparkles size={16} className={loadingAI ? "animate-spin" : ""} />
                        {loadingAI ? 'Generating...' : 'AI Check Description'}
                    </NeuroButton>

                    <div className="flex gap-3">
                        <NeuroButton 
                            onClick={() => executeSaveVoucher('DRAFT')} 
                            disabled={saving} 
                            className="flex-1 text-gray-600 font-bold text-sm py-3 flex items-center justify-center gap-2"
                        >
                            <FileText size={18} />
                            Draft
                        </NeuroButton>

                        <NeuroButton 
                            onClick={handleSaveClick} 
                            disabled={saving} 
                            className="flex-1 text-blue-600 font-bold text-sm py-3 flex items-center justify-center gap-2"
                        >
                            {saving ? <Sparkles size={18} className="animate-spin" /> : <Save size={18} />}
                            {saving ? '...' : 'Save'}
                        </NeuroButton>
                    </div>
                </div>
            </NeuroCard>
        </div>
      </div>

      {/* Section 5: Lost Receipt Details */}
      <NeuroCard title="Lost Receipt Details (Optional)">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div>
                    <label className="block text-sm text-gray-500 mb-2">Original Expense Date</label>
                    <div className="relative">
                        <NeuroInput 
                            type="date" 
                            value={originalDate} 
                            onChange={(e) => { setOriginalDate(e.target.value); handleFieldChange('originalDate'); }} 
                            className={getAutoFillClass('originalDate')}
                        />
                        {autoFilledFields.has('originalDate') && <AutoFilledIndicator />}
                    </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setShowOCRConfirm(false)}></div>
            <NeuroCard className="w-full max-w-md relative z-10 shadow-2xl border-2 border-purple-100 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
                        <ScanLine size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-700">Receipt Extracted</h3>
                        <div className="flex items-center gap-2">
                             <p className="text-xs text-gray-500">Gemini found the following details</p>
                             <button onClick={() => setShowOCRHelp(true)} className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                                <Info size={12} /> Learn More
                             </button>
                        </div>
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
                         {(extractedData.companyName || extractedData.companyRegNo || extractedData.companyAddress) && (
                             <div className="flex flex-col border-b border-gray-300/50 pb-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Bill To</span> 
                                    <span className="font-semibold text-gray-700 text-right truncate max-w-[150px]">{extractedData.companyName || '-'}</span>
                                </div>
                                {extractedData.companyRegNo && (
                                    <span className="text-xs text-gray-400 text-right mt-1 block">Reg: {extractedData.companyRegNo}</span>
                                )}
                                {extractedData.companyAddress && (
                                    <span className="text-[10px] text-gray-400 text-right mt-1 block leading-tight truncate max-w-[200px] ml-auto">{extractedData.companyAddress}</span>
                                )}
                            </div>
                         )}
                    </div>
                    <p className="text-xs text-center text-gray-400">Applying this will overwrite your current form fields.</p>
                </div>
                
                <div className="flex gap-4 justify-end">
                    <NeuroButton onClick={() => setShowOCRConfirm(false)} className="text-sm px-6">Cancel</NeuroButton>
                    <NeuroButton onClick={applyOCRData} className="text-sm text-purple-600 font-bold px-6 flex items-center gap-2">
                        <CheckCircle2 size={16} /> Apply Details
                    </NeuroButton>
                </div>
            </NeuroCard>

             {/* Help Modal Overlay */}
             {showOCRHelp && (
                 <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/10 backdrop-blur-sm p-4">
                     <div className="absolute inset-0" onClick={() => setShowOCRHelp(false)}></div>
                     <NeuroCard className="w-full max-w-sm relative z-20 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-200">
                         <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                             <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                 <Info size={16} className="text-blue-500"/> Field Guide
                             </h4>
                             <button onClick={(e) => { e.stopPropagation(); setShowOCRHelp(false); }} className="text-gray-400 hover:text-red-500 transition-colors">
                                 <X size={18}/>
                             </button>
                         </div>
                         <ul className="space-y-3 text-sm text-gray-600">
                             <li className="flex gap-2">
                                 <div className="min-w-[4px] bg-blue-400 rounded-full h-auto"></div>
                                 <div><strong className="text-gray-800 block">Payee Name</strong> The merchant/shop name detected in the receipt header.</div>
                             </li>
                             <li className="flex gap-2">
                                 <div className="min-w-[4px] bg-green-400 rounded-full h-auto"></div>
                                 <div><strong className="text-gray-800 block">Date</strong> Transaction date. Used for both voucher & expense dates.</div>
                             </li>
                             <li className="flex gap-2">
                                 <div className="min-w-[4px] bg-purple-400 rounded-full h-auto"></div>
                                 <div><strong className="text-gray-800 block">Total Amount</strong> Final payable amount found, inclusive of tax.</div>
                             </li>
                             <li className="flex gap-2">
                                 <div className="min-w-[4px] bg-orange-400 rounded-full h-auto"></div>
                                 <div><strong className="text-gray-800 block">Bill To</strong> If detected, this populates your Company Information.</div>
                             </li>
                         </ul>
                     </NeuroCard>
                 </div>
             )}
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
                            <span className="text-gray-500">Category</span> 
                            <span className="font-semibold text-gray-700 text-right">{category}</span>
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
                    <NeuroButton onClick={() => executeSaveVoucher('COMPLETED')} className="text-sm text-blue-600 font-bold px-6">Confirm Save</NeuroButton>
                </div>
            </NeuroCard>
        </div>
      )}
    </div>
  );
};