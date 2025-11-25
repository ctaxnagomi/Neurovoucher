import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeuroCard, NeuroInput, NeuroButton, NeuroBadge, NeuroTextarea, NeuroSelect, NeuroToggle } from '../components/NeuroComponents';
import { generateFastSummary, generateSpeech, extractReceiptData, getLiveClient, extractLetterhead } from '../services/geminiService';
import { createPcmBlob } from '../services/audioUtils';
import { Sparkles, Play, Plus, Trash2, Save, Upload, X, Calendar, FileText, AlertTriangle, Building2, User, ScanLine, CheckCircle2, Mic, MicOff, Tag, Info, Image as ImageIcon, Languages, Download, Eye, Mail, Phone, Printer, ShieldCheck, FileCheck, HelpCircle, ExternalLink, Layers, Loader2, ArrowRight, Pencil, Coins, FileSpreadsheet, MessageSquare, ListTodo, CreditCard, FileType } from 'lucide-react';
import { VoucherItem, SUPPORTED_LANGUAGES } from '../types';
import { Modality, LiveServerMessage } from '@google/genai';
import { jsPDF } from "jspdf";
import { generateDetailedVoucherExcel } from '../lib/export/excel-generator';
import { useLiveAgent } from '../contexts/LiveAgentContext';

// Number to Words Implementation
const numberToWords = (n: number): string => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const scales = ['', 'THOUSAND', 'MILLION', 'BILLION'];

    if (n === 0) return 'ZERO';

    const convertChunk = (num: number): string => {
        let str = '';
        if (num >= 100) {
            str += ones[Math.floor(num / 100)] + ' HUNDRED';
            num %= 100;
            if (num > 0) str += ' ';
        }
        if (num > 0) {
            if (num < 20) {
                str += ones[num];
            } else {
                str += tens[Math.floor(num / 10)];
                if (num % 10 > 0) str += '-' + ones[num % 10];
            }
        }
        return str;
    };

    let words = '';
    let scaleIndex = 0;
    let num = Math.floor(n);
    
    if (num === 0) words = 'ZERO';
    else {
        while (num > 0) {
            const chunk = num % 1000;
            if (chunk > 0) {
                const chunkStr = convertChunk(chunk);
                words = chunkStr + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (words ? ' ' + words : '');
            }
            num = Math.floor(num / 1000);
            scaleIndex++;
        }
    }
    return words;
};

const toWords = (amount: number) => {
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    let result = numberToWords(integerPart);
    
    if (decimalPart > 0) {
        result += ` AND CENTS ${numberToWords(decimalPart)}`;
    }
    
    return `${result} MALAYSIAN RINGGIT ONLY`;
};

// Placeholder Constants to ensure consistency between UI and Logic
const PLACEHOLDERS = {
    companyName: "e.g., My Tech Sdn Bhd",
    companyRegNo: "e.g., 202301000XXX",
    companyAddress: "Full business address...",
    companyTel: "e.g., +603-1234 5678",
    companyEmail: "finance@company.com",
    companyFax: "e.g., +603-1234 5679",
    payee: "e.g., Ali Bin Abu",
    payeeIc: "e.g., 880101-14-XXXX (Required)",
    payeeAddress: "e.g., No 123, Jalan 1, 50000 KL",
    payeeEmail: "payee@example.com",
    voucherNo: "PV-YYYY-XXXX",
    description: "e.g., Purchase of A4 Paper (Avoid 'Misc')",
    evidenceType: "e.g., Tax Invoice / Receipt",
    evidenceRef: "e.g., INV-2024-001",
    lostReason: "Brief explanation for why the original receipt is missing...",
    taxCategory: "e.g., Entertainment (Restricted)",
    taxCode: "e.g., PU(A) 400 Vol. 64",
    taxReason: "e.g., Wholly and exclusively incurred in the production of gross income.",
    paymentRef: "e.g., MBB-123456 or Cheque 998877",
    bankName: "e.g., Maybank"
};

interface BatchItem {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    data?: any;
    previewUrl: string;
    error?: string;
}

// Styling Constants for White Neumorphic Theme
const WHITE_INPUT_THEME = "!bg-white !shadow-[inset_2px_2px_5px_rgba(163,177,198,0.15),inset_-2px_-2px_5px_rgba(255,255,255,0.8)] !border-transparent placeholder:!text-gray-400 focus:!ring-2 focus:!ring-blue-100/50";
const AUTO_FILLED_THEME = "!bg-purple-50 !shadow-[inset_2px_2px_5px_rgba(147,51,234,0.05)] !text-purple-700 !border-purple-100 focus:!ring-2 focus:!ring-purple-200";

const AutoFilledIndicator = ({ className }: { className?: string }) => (
    <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 animate-pulse z-10 pointer-events-auto cursor-help ${className}`} title="Auto-filled by AI">
        <Sparkles size={16} fill="currentColor" className="opacity-70" />
    </div>
);

export const VoucherGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { connected } = useLiveAgent();

  // Voucher / Payee Details
  const [payee, setPayee] = useState('');
  const [payeeIc, setPayeeIc] = useState('');
  const [payeeAddress, setPayeeAddress] = useState('');
  const [payeeEmail, setPayeeEmail] = useState('');
  
  const [voucherDate, setVoucherDate] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState('Online Transfer');
  const [bankName, setBankName] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  
  // Company Details (Issuer/Bill-To)
  const [companyName, setCompanyName] = useState('');
  const [companyRegNo, setCompanyRegNo] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyTel, setCompanyTel] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyFax, setCompanyFax] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // Authorization Details
  const [preparedBy, setPreparedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');

  // Lost Receipt Details
  const [originalDate, setOriginalDate] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [evidenceType, setEvidenceType] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');

  // LHDN Tax Compliance
  const [isTaxDeductible, setIsTaxDeductible] = useState(false);
  const [taxCategory, setTaxCategory] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [taxReason, setTaxReason] = useState('');
  const [showLHDNHelp, setShowLHDNHelp] = useState(false);

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
  const [ocrLanguage, setOcrLanguage] = useState('en');
  const [errorModal, setErrorModal] = useState<{show: boolean, message: string, title?: string}>({ show: false, message: '' });

  // Batch Scan State
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  
  // PDF Preview State
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Auto-filled field tracking
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  
  // Progress Tracking
  const [progress, setProgress] = useState(0);

  // Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const dictationCleanupRef = useRef<() => void>(() => {});

  const fileInputRef = useRef<HTMLInputElement>(null); // For Receipt OCR
  const batchInputRef = useRef<HTMLInputElement>(null); // For Batch OCR
  const companyDocInputRef = useRef<HTMLInputElement>(null); // For Company Doc OCR
  const logoInputRef = useRef<HTMLInputElement>(null); // For Company Logo

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // Calculate Progress Logic
  useEffect(() => {
    let score = 0;
    const totalWeights = 5; // Total criteria sections
    const weightPerSection = 100 / totalWeights;

    // 1. Company Info (20%)
    if (companyName && companyRegNo && companyAddress) score += weightPerSection;
    else if (companyName || companyRegNo) score += (weightPerSection / 2);

    // 2. Voucher Details (20%)
    if (payee && voucherDate && (voucherNo || description) && paymentMethod) score += weightPerSection;
    else if (payee || voucherDate) score += (weightPerSection / 2);

    // 3. Line Items (20%)
    if (items.length > 0 && items.some(i => i.amount > 0 && i.description)) score += weightPerSection;

    // 4. Logo (20%)
    if (companyLogo) score += weightPerSection;

    // 5. Receipt/Evidence (20%)
    if (lostReason || (evidenceRef && evidenceType)) score += weightPerSection;
    else if (items.length > 0 && payee) score += (weightPerSection / 2); 

    setProgress(Math.min(100, Math.round(score)));
  }, [companyName, companyRegNo, companyAddress, payee, voucherDate, voucherNo, description, items, companyLogo, lostReason, evidenceRef, evidenceType, paymentMethod]);


  // Fetch Categories on Mount
  useEffect(() => {
    const fetchCategories = async () => {
        const defaultCategories = [
            "General Expense", 
            "Travel & Transport", 
            "Office Supplies", 
            "Meals & Entertainment", 
            "Utilities", 
            "Professional Services", 
            "Medical", 
            "Maintenance & Repairs", 
            "Training & Development",
            "Staff Welfare"
        ];
        setCategories(defaultCategories);
        setCategory(defaultCategories[0]);
    };
    fetchCategories();
  }, []);

  // Cleanup dictation on unmount
  useEffect(() => {
    return () => {
      dictationCleanupRef.current();
    };
  }, []);

  // Live Agent Tool Event Listeners
  useEffect(() => {
      const handleFillForm = (e: CustomEvent) => {
          const data = e.detail;
          const newAutoFilled = new Set(autoFilledFields);

          // Helper to update state
          const update = (key: string, val: any, setter: Function) => {
              if (val) {
                  setter(val);
                  newAutoFilled.add(key);
              }
          };

          // Basic Fields
          update('payee', data.payee, setPayee);
          update('payeeIc', data.payeeIc, setPayeeIc);
          update('voucherNo', data.voucherNo, setVoucherNo);
          update('voucherDate', data.date, setVoucherDate);
          update('category', data.category, setCategory);
          update('description', data.description, setDescription);
          update('preparedBy', data.preparedBy, setPreparedBy);
          update('approvedBy', data.approvedBy, setApprovedBy);

          // Company Fields
          update('companyName', data.companyName, setCompanyName);
          update('companyRegNo', data.companyRegNo, setCompanyRegNo);
          update('companyAddress', data.companyAddress, setCompanyAddress);
          update('companyTel', data.companyTel, setCompanyTel);
          update('companyEmail', data.companyEmail, setCompanyEmail);

          // Lost Receipt Fields
          update('originalDate', data.originalDate, setOriginalDate);
          update('evidenceType', data.evidenceType, setEvidenceType);
          update('evidenceRef', data.evidenceRef, setEvidenceRef);
          update('lostReason', data.lostReason, setLostReason);

          setAutoFilledFields(newAutoFilled);
      };

      const handleAddItem = (e: CustomEvent) => {
          const data = e.detail;
          if (data.description || data.amount) {
              setItems(prev => [
                  ...prev, 
                  { 
                      id: Date.now().toString(), 
                      description: data.description || "New Item", 
                      amount: Number(data.amount) || 0 
                  }
              ]);
          }
      };

      const handleDownload = () => {
          generatePDF('download');
      };

      window.addEventListener('neuro-fill-voucher' as any, handleFillForm as any);
      window.addEventListener('neuro-add-item' as any, handleAddItem as any);
      window.addEventListener('neuro-download-pdf' as any, handleDownload as any);
      
      return () => {
          window.removeEventListener('neuro-fill-voucher' as any, handleFillForm as any);
          window.removeEventListener('neuro-add-item' as any, handleAddItem as any);
          window.removeEventListener('neuro-download-pdf' as any, handleDownload as any);
      };
  }, [autoFilledFields]);

  // Cleanup PDF URL on preview close
  useEffect(() => {
      if (!showPdfPreview && previewPdfUrl) {
          URL.revokeObjectURL(previewPdfUrl);
          setPreviewPdfUrl(null);
      }
  }, [showPdfPreview, previewPdfUrl]);

  const handleFieldChange = (field: string) => {
    if (autoFilledFields.has(field)) {
        const next = new Set(autoFilledFields);
        next.delete(field);
        setAutoFilledFields(next);
    }
  };

  const getAutoFillClass = (field: string) => 
    autoFilledFields.has(field) ? AUTO_FILLED_THEME : WHITE_INPUT_THEME;

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', amount: 0 }]);
  };

  const updateItem = (id: string, field: keyof VoucherItem, value: any) => {
    setItems((prevItems) => prevItems.map((item) => {
        if (item.id === id) {
            return { ...item, [field]: value };
        }
        return item;
    }));
    if (field === 'amount' || field === 'description') {
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
    const prompt = `Summarize these expense items for a formal payment voucher description. Keep it specific and professional for tax audit purposes (LHDN Malaysia compliant). Items: ${validItems.map(i => i.description).join(', ')}`;
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
        
        const sessionPromise = client.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                systemInstruction: "You are a passive listener acting as a dictation tool.",
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
                onclose: () => setIsDictating(false),
                onerror: (e) => { console.error("Dictation error", e); setIsDictating(false); }
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
        alert("Failed to access microphone.");
    }
  };

  const handleReadAloud = async () => {
    setPlayingAudio(true);
    const textToRead = `Voucher ${voucherNo ? voucherNo : ''} for ${payee}. Total amount is ${toWords(total)}.`;
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

  // --- Handlers from Original File (Receipt Scan, Company Scan, PDF, etc.) ---
  const shouldUpdate = (currentVal: string, fieldKey?: string, placeholder?: string) => {
    if (fieldKey && autoFilledFields.has(fieldKey)) return true;
    const val = (currentVal || '').trim();
    const ph = (placeholder || '').trim();
    if (val.length === 0) return true;
    if (ph.length > 0 && val.toLowerCase() === ph.toLowerCase()) return true;
    return false;
  };

  const shouldUpdateCompanyFromReceipt = (currentVal: string, placeholder?: string) => {
    const val = (currentVal || '').trim();
    const ph = (placeholder || '').trim();
    if (val.length === 0) return true;
    if (ph.length > 0 && val.toLowerCase() === ph.toLowerCase()) return true;
    return false;
  };

  const handleCompanyScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            const data = await extractLetterhead(base64String);
            if (data) {
                const newAutoFilled = new Set(autoFilledFields);
                const apply = (current: string, incoming: string | undefined, setter: Function, key: string, ph: string) => {
                    if (incoming && shouldUpdate(current, key, ph)) {
                        setter(incoming);
                        newAutoFilled.add(key);
                    }
                };
                apply(companyName, data.companyName, setCompanyName, 'companyName', PLACEHOLDERS.companyName);
                apply(companyRegNo, data.regNo, setCompanyRegNo, 'companyRegNo', PLACEHOLDERS.companyRegNo);
                apply(companyAddress, data.address, setCompanyAddress, 'companyAddress', PLACEHOLDERS.companyAddress);
                apply(companyTel, data.phone, setCompanyTel, 'companyTel', PLACEHOLDERS.companyTel);
                apply(companyEmail, data.email, setCompanyEmail, 'companyEmail', PLACEHOLDERS.companyEmail);
                setAutoFilledFields(newAutoFilled);
            }
            setScanning(false);
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error(error);
        setScanning(false);
    }
    if (companyDocInputRef.current) companyDocInputRef.current.value = '';
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorModal({ show: false, message: '' }); 
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        try {
            const base64String = (reader.result as string).split(',')[1];
            const data = await extractReceiptData(base64String, ocrLanguage);
            if (!data || Object.keys(data).length === 0) throw new Error("EMPTY_DATA");
            setExtractedData(data);
            setShowOCRConfirm(true);
        } catch (error: any) {
            console.error("OCR Error:", error);
            setErrorModal({ show: true, message: "Failed to process receipt.", title: "Scan Failed" });
        } finally {
            setScanning(false);
        }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBatchScan = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const newItems: BatchItem[] = Array.from(files).map((file: File) => ({
          id: Math.random().toString(36).substring(7),
          file: file,
          status: 'pending',
          previewUrl: URL.createObjectURL(file)
      }));
      setBatchQueue(prev => [...prev, ...newItems]);
      setShowBatchModal(true);
      if (batchInputRef.current) batchInputRef.current.value = '';
      processBatchQueue([...batchQueue, ...newItems]);
  };

  const processBatchQueue = async (queue: BatchItem[]) => {
      if (isBatchProcessing) return;
      setIsBatchProcessing(true);
      const pendingItems = queue.filter(item => item.status === 'pending');
      const CHUNK_SIZE = 3;
      for (let i = 0; i < pendingItems.length; i += CHUNK_SIZE) {
          const chunk = pendingItems.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map(async (item) => {
              setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing' } : q));
              try {
                  const base64String = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve((reader.result as string).split(',')[1]);
                      reader.onerror = reject;
                      reader.readAsDataURL(item.file);
                  });
                  const data = await extractReceiptData(base64String, ocrLanguage);
                  if (!data) throw new Error("Empty Data");
                  setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', data } : q));
              } catch (err: any) {
                  setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: err.message || "Failed" } : q));
              }
          }));
      }
      setIsBatchProcessing(false);
  };

  const loadFromBatch = (item: BatchItem) => {
      if (!item.data) return;
      setExtractedData(item.data);
      setShowOCRConfirm(true);
      setShowBatchModal(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setCompanyLogo(reader.result as string);
        reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setCompanyLogo(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const applyOCRData = (overrideData?: any) => {
    const sourceData = overrideData || extractedData;
    if (!sourceData) return;
    const newAutoFilled = new Set<string>(autoFilledFields);
    
    const applyIfEligible = (currentValue: string, newValue: any, fieldKey: string, setter: (val: any) => void, placeholder?: string) => {
        if (newValue && shouldUpdate(currentValue, fieldKey, placeholder)) {
            setter(newValue);
            newAutoFilled.add(fieldKey);
        }
    };
    const applyCompanyField = (currentValue: string, newValue: any, fieldKey: string, setter: (val: any) => void, placeholder?: string) => {
        if (newValue && shouldUpdateCompanyFromReceipt(currentValue, placeholder)) {
            setter(newValue);
            newAutoFilled.add(fieldKey);
        }
    };
    const isCompanySameAsPayee = sourceData.companyName && sourceData.payeeName && (
        sourceData.companyName.toLowerCase().trim() === sourceData.payeeName.toLowerCase().trim() ||
        sourceData.companyName.toLowerCase().includes(sourceData.payeeName.toLowerCase())
    );

    applyIfEligible(payee, sourceData.payeeName, 'payee', setPayee, PLACEHOLDERS.payee);
    applyIfEligible(payeeIc, sourceData.payeeId, 'payeeIc', setPayeeIc, PLACEHOLDERS.payeeIc);
    
    if (sourceData.date) {
        if (shouldUpdate(voucherDate, 'voucherDate')) {
            setVoucherDate(sourceData.date);
            newAutoFilled.add('voucherDate');
        }
        if (shouldUpdate(originalDate, 'originalDate')) {
            setOriginalDate(sourceData.date); 
            newAutoFilled.add('originalDate');
        }
    }
    
    if (!isCompanySameAsPayee) {
        applyCompanyField(companyName, sourceData.companyName, 'companyName', setCompanyName, PLACEHOLDERS.companyName);
        applyCompanyField(companyRegNo, sourceData.companyRegNo, 'companyRegNo', setCompanyRegNo, PLACEHOLDERS.companyRegNo);
        applyCompanyField(companyAddress, sourceData.companyAddress, 'companyAddress', setCompanyAddress, PLACEHOLDERS.companyAddress);
        applyCompanyField(companyTel, sourceData.companyTel, 'companyTel', setCompanyTel, PLACEHOLDERS.companyTel);
        applyCompanyField(companyEmail, sourceData.companyEmail, 'companyEmail', setCompanyEmail, PLACEHOLDERS.companyEmail);
        applyCompanyField(companyFax, sourceData.companyFax, 'companyFax', setCompanyFax, PLACEHOLDERS.companyFax);
    }

    if (sourceData.totalAmount) {
        if (items.length === 0) {
            const newItemId = Date.now().toString();
            setItems([{ id: newItemId, description: 'Receipt Import', amount: sourceData.totalAmount }]);
            newAutoFilled.add(`item-${newItemId}-amount`);
        } else if (items.length === 1) {
            const item = items[0];
            const amountKey = `item-${item.id}-amount`;
            const isDescEmpty = !item.description || item.description === PLACEHOLDERS.description || item.description.trim() === '';
            if (Number(item.amount) === 0 || autoFilledFields.has(amountKey)) {
                 const updatedItem = { ...item, amount: sourceData.totalAmount };
                 newAutoFilled.add(amountKey);
                 if (isDescEmpty) updatedItem.description = 'Receipt Import';
                 setItems([updatedItem]);
            }
        }
    }
    if (sourceData.taxCategory) {
        const matchedCat = categories.find(c => c.toLowerCase().includes(sourceData.taxCategory.toLowerCase()));
        if (matchedCat) applyIfEligible(category, matchedCat, 'category', setCategory, categories[0]);
        applyIfEligible(taxCategory, sourceData.taxCategory, 'taxCategory', setTaxCategory, PLACEHOLDERS.taxCategory);
    }
    if (sourceData.taxReason) applyIfEligible(description, sourceData.taxReason, 'description', setDescription, PLACEHOLDERS.description);
    if (sourceData.taxDeductible !== undefined && (!isTaxDeductible || autoFilledFields.has('isTaxDeductible'))) {
        setIsTaxDeductible(sourceData.taxDeductible);
        newAutoFilled.add('isTaxDeductible');
    }
    if (sourceData.taxCode || sourceData.taxLimit) {
        const combinedCode = [sourceData.taxCode, sourceData.taxLimit].filter(Boolean).join(' - ');
        applyIfEligible(taxCode, combinedCode, 'taxCode', setTaxCode, PLACEHOLDERS.taxCode);
    }
    if (sourceData.taxReason) applyIfEligible(taxReason, sourceData.taxReason, 'taxReason', setTaxReason, PLACEHOLDERS.taxReason);

    setAutoFilledFields(newAutoFilled);
    if (!overrideData) {
        setShowOCRConfirm(false);
        setExtractedData(null);
    }
  };

  const handleExtractedDataChange = (field: string, value: any) => {
    if (!extractedData) return;
    setExtractedData({ ...extractedData, [field]: value });
  };

  const handleApplyOCRConfirm = () => applyOCRData();

  const handleSaveClick = () => {
    const errors: string[] = [];
    if (!companyName.trim()) errors.push("Company Name is required.");
    if (!companyRegNo.trim()) errors.push("Company Registration No is required.");
    if (!payee.trim()) errors.push("Payee Name is required.");
    if (!voucherDate) errors.push("Voucher Date is required.");
    if (items.length === 0) errors.push("At least one item is required.");
    if (errors.length > 0) {
        alert("Compliance Validation Failed:\n\n- " + errors.join("\n- "));
        return;
    }
    setShowConfirmDialog(true);
  };

  const generatePDF = (mode: 'download' | 'preview' = 'download') => {
    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        // --- 1. Header Section ---
        const leftM = 15;
        const rightM = 195;
        let y = 15;

        // Border
        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.3);
        doc.rect(10, 10, 190, 277);

        // Logo
        if (companyLogo) {
             try {
                const imgProps = doc.getImageProperties(companyLogo);
                // Maintain aspect ratio, max width 40, max height 25
                doc.addImage(companyLogo, imgProps.fileType, leftM, y, 35, 20);
             } catch(e) {}
        }
        
        // Company Info
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        const titleX = companyLogo ? 60 : leftM;
        doc.text(companyName.toUpperCase(), titleX, y+6);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Co. Reg No: ${companyRegNo}`, titleX, y+11);
        doc.text(companyAddress || "", titleX, y+16);
        let contactStr = "";
        if(companyTel) contactStr += `Tel: ${companyTel}  `;
        if(companyEmail) contactStr += `Email: ${companyEmail}`;
        doc.text(contactStr, titleX, y+24);

        y += 35; // Move down

        // Voucher Title Box
        doc.setFillColor(230, 230, 230);
        doc.rect(10, y, 190, 10, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(50, 50, 50);
        doc.text("PAYMENT VOUCHER", 105, y+7, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        y += 18;

        // --- 2. Voucher & Payee Info (Grid) ---
        doc.setFontSize(10);
        
        // Left Column (Payee)
        doc.setFont("helvetica", "bold");
        doc.text("PAY TO:", leftM, y);
        doc.setFont("helvetica", "normal");
        doc.text(payee, leftM, y+5);
        if(payeeIc) {
             doc.setFontSize(9);
             doc.text(`IC/Reg: ${payeeIc}`, leftM, y+10);
        }
        if(payeeAddress) {
            doc.setFontSize(9);
            const splitAddress = doc.splitTextToSize(payeeAddress, 80);
            doc.text(splitAddress, leftM, y+15);
        }

        // Right Column (Voucher Details)
        const col2X = 120;
        doc.setFontSize(10);
        
        doc.setFont("helvetica", "bold");
        doc.text("Voucher No:", col2X, y);
        doc.setFont("helvetica", "normal");
        doc.text(voucherNo, col2X + 30, y);
        
        doc.setFont("helvetica", "bold");
        doc.text("Date:", col2X, y+6);
        doc.setFont("helvetica", "normal");
        doc.text(voucherDate, col2X + 30, y+6);

        // Payment Details Block
        y += 30;
        doc.setDrawColor(200, 200, 200);
        doc.line(leftM, y, rightM, y);
        y += 6;
        
        doc.setFont("helvetica", "bold");
        doc.text("PAYMENT DETAILS", leftM, y);
        y += 6;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Method: ${paymentMethod}`, leftM, y);
        if(bankName) doc.text(`Bank: ${bankName}`, leftM + 50, y);
        if(paymentRef) doc.text(`Ref No: ${paymentRef}`, leftM + 110, y);

        y += 10;

        // --- 3. Line Items Table ---
        const tableTop = y;
        
        // Header
        doc.setFillColor(240, 240, 240);
        doc.rect(leftM, tableTop, 175, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.text("#", leftM+2, tableTop+5);
        doc.text("DESCRIPTION", leftM+15, tableTop+5);
        doc.text("AMOUNT (RM)", rightM-5, tableTop+5, { align: 'right' });
        
        y += 12;
        doc.setFont("helvetica", "normal");

        items.forEach((item, i) => {
            doc.text(`${i+1}`, leftM+2, y);
            const descLines = doc.splitTextToSize(item.description, 120);
            doc.text(descLines, leftM+15, y);
            doc.text(Number(item.amount).toFixed(2), rightM-5, y, { align: 'right' });
            y += (descLines.length * 5) + 3; // Dynamic height
        });
        
        // Bottom Line of Table
        doc.line(leftM, y, rightM, y);
        y += 2;

        // --- 4. Total & Words ---
        y += 6;
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL:", 130, y);
        doc.setFontSize(12);
        doc.text(`RM ${total.toFixed(2)}`, rightM-5, y, { align: 'right' });

        y += 8;
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text(`Ringgit Malaysia: ${toWords(total)}`, leftM, y);
        
        // --- 5. Signatories ---
        y = 240; // Push to bottom area
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        
        doc.line(leftM, y, leftM+40, y);
        doc.text("Prepared By", leftM, y+5);
        doc.text(preparedBy || "(Name & Sign)", leftM, y+10);
        
        doc.line(leftM+60, y, leftM+100, y);
        doc.text("Approved By", leftM+60, y+5);
        doc.text(approvedBy || "(Name & Sign)", leftM+60, y+10);
        
        doc.line(leftM+120, y, leftM+160, y);
        doc.text("Received By", leftM+120, y+5);
        doc.text(payee, leftM+120, y+10);
        
        // Footer Note
        doc.setFontSize(7);
        doc.text("Computer Generated Voucher - NeuroVoucher AI System", 105, 280, { align: 'center' });

        if (mode === 'download') doc.save(`Voucher_${voucherNo || 'Draft'}.pdf`);
        else {
            const pdfBlob = doc.output('blob');
            setPreviewPdfUrl(URL.createObjectURL(pdfBlob));
            setShowPdfPreview(true);
        }
    } catch (e) { console.error(e); }
  };

  const handleDownloadPDF = () => generatePDF('download');
  const handlePreviewPDF = () => generatePDF('preview');
  
  const handleExportExcel = () => {
    try {
        const data = { companyName, companyRegNo, companyAddress, companyTel, voucherNo, date: voucherDate, payee, payeeIc, category, items, total, preparedBy, approvedBy, paymentMethod, bankName, paymentRef };
        const blob = generateDetailedVoucherExcel(data);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Voucher_${voucherNo || 'Draft'}.xlsx`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch(e) {
        console.error("Excel Export Failed", e);
    }
  };
  
  const handleExportWord = () => {
    try {
        // Construct a simple HTML document for Word
        const content = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Payment Voucher</title></head>
            <body style="font-family: Arial, sans-serif;">
                <h2 style="text-align:center">${companyName.toUpperCase()}</h2>
                <p style="text-align:center; font-size: 10px;">${companyAddress} | Reg: ${companyRegNo}</p>
                <hr/>
                <h3 style="text-align:center; background-color: #eee; padding: 5px;">PAYMENT VOUCHER</h3>
                
                <table style="width:100%; margin-bottom: 20px;">
                    <tr>
                        <td valign="top"><strong>Pay To:</strong><br/>${payee}<br/>${payeeIc}<br/>${payeeAddress}</td>
                        <td valign="top" align="right"><strong>Voucher No:</strong> ${voucherNo}<br/><strong>Date:</strong> ${voucherDate}</td>
                    </tr>
                </table>

                <p><strong>Payment Method:</strong> ${paymentMethod} | <strong>Bank:</strong> ${bankName} | <strong>Ref:</strong> ${paymentRef}</p>

                <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse: collapse;">
                    <tr style="background-color: #f0f0f0;">
                        <th>No</th><th>Description</th><th align="right">Amount (RM)</th>
                    </tr>
                    ${items.map((item, i) => `
                        <tr>
                            <td>${i+1}</td>
                            <td>${item.description}</td>
                            <td align="right">${Number(item.amount).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td colspan="2" align="right"><strong>TOTAL</strong></td>
                        <td align="right"><strong>${total.toFixed(2)}</strong></td>
                    </tr>
                </table>
                <p style="font-style: italic;">Ringgit Malaysia: ${toWords(total)}</p>

                <br/><br/>
                <table style="width:100%; margin-top: 30px;">
                    <tr>
                        <td style="border-top: 1px solid black; width: 30%;">Prepared By: ${preparedBy}</td>
                        <td style="width: 5%;"></td>
                        <td style="border-top: 1px solid black; width: 30%;">Approved By: ${approvedBy}</td>
                        <td style="width: 5%;"></td>
                        <td style="border-top: 1px solid black; width: 30%;">Received By: ${payee}</td>
                    </tr>
                </table>
            </body></html>
        `;

        const blob = new Blob(['\ufeff', content], {
            type: 'application/msword'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Voucher_${voucherNo || 'Draft'}.doc`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch(e) {
        console.error("Word Export Failed", e);
    }
  };

  const executeSaveVoucher = (status: 'DRAFT' | 'COMPLETED' = 'COMPLETED') => {
    setShowConfirmDialog(false);
    setSaving(true);
    setTimeout(() => { setSaving(false); alert("Saved!"); }, 1000);
  };

  return (
    <div className="space-y-6 md:space-y-8 relative max-w-7xl mx-auto pb-12 p-2 md:p-0">
      
      {/* Header with Compliance Tracker */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-700 tracking-tight">New Cash Voucher</h2>
            <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500 mt-1">Generate a new payment voucher with AI assistance</p>
                {connected && (
                    <div className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 animate-pulse flex items-center gap-1 mt-1">
                         <Mic size={10} /> Live Agent Connected
                    </div>
                )}
            </div>
        </div>

        {/* Smart Compliance Tracker (Visible to Agent) */}
        <div className="w-full lg:w-96 bg-white rounded-2xl p-4 shadow-lg border border-purple-100 flex flex-col gap-3 relative overflow-hidden group">
            <div className="flex justify-between items-center z-10">
                <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                    <ListTodo size={14} className="text-purple-500" /> Compliance Progress
                </h3>
                <span className={`text-xs font-bold ${progress === 100 ? 'text-green-600' : 'text-purple-600'}`}>{progress}%</span>
            </div>
            
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden z-10">
                <div 
                    className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-green-500' : 'bg-purple-500'}`} 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {progress < 100 && (
                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 z-10">
                    <div className={`flex items-center gap-1 ${companyLogo ? 'text-green-600 line-through opacity-50' : 'text-red-500'}`}>
                        {companyLogo ? <CheckCircle2 size={10}/> : <X size={10}/>} Logo Upload
                    </div>
                    <div className={`flex items-center gap-1 ${items.length > 0 ? 'text-green-600 line-through opacity-50' : 'text-red-500'}`}>
                         {items.length > 0 ? <CheckCircle2 size={10}/> : <X size={10}/>} Line Items
                    </div>
                    <div className={`flex items-center gap-1 ${payee ? 'text-green-600 line-through opacity-50' : 'text-red-500'}`}>
                         {payee ? <CheckCircle2 size={10}/> : <X size={10}/>} Payee Info
                    </div>
                    <div className={`flex items-center gap-1 ${lostReason || (evidenceType) ? 'text-green-600 line-through opacity-50' : 'text-red-500'}`}>
                         {(lostReason || evidenceType) ? <CheckCircle2 size={10}/> : <X size={10}/>} Evidence
                    </div>
                </div>
            )}
            
            {/* Background Glow for Agent Vision */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-200/50 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end w-full">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleReceiptScan} />
            <input type="file" ref={batchInputRef} className="hidden" accept="image/*" onChange={handleBatchScan} multiple />

            <NeuroButton onClick={() => fileInputRef.current?.click()} disabled={scanning} className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm">
                <Upload size={16} /> Upload Receipt
            </NeuroButton>
            <NeuroButton onClick={handleReadAloud} disabled={playingAudio} className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm">
                <Play size={16} /> Read Aloud
            </NeuroButton>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
        
        {/* Section 1: Company Information */}
        <div className="xl:col-span-4 h-full">
            <NeuroCard className="h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-600 uppercase tracking-wider">Company Information</h3>
                    <input type="file" ref={companyDocInputRef} onChange={handleCompanyScan} className="hidden" accept="image/*" />
                    <button onClick={() => companyDocInputRef.current?.click()} className="text-xs flex items-center gap-2 text-blue-500 bg-blue-50 px-2 py-1 rounded-md">
                        <ScanLine size={14} /> Auto-fill
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center mb-6">
                         <div className="relative w-28 h-28 group">
                            <div className={`w-full h-full rounded-2xl overflow-hidden flex items-center justify-center transition-all ${companyLogo ? 'bg-white' : 'bg-[#e0e5ec] shadow-[inset_6px_6px_12px_rgba(163,177,198,0.6),inset_-6px_-6px_12px_rgba(255,255,255,0.5)]'}`}>
                                {companyLogo ? (
                                    <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="text-center text-gray-400 p-2 cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                        <ImageIcon size={28} className="mx-auto mb-2 opacity-50" />
                                        <span className="text-[10px] uppercase font-bold tracking-wider block">Upload Logo</span>
                                    </div>
                                )}
                            </div>
                            {companyLogo && <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md"><X size={12} strokeWidth={3} /></button>}
                            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                         </div>
                    </div>

                    {/* Named Inputs for AI Access */}
                    <div className="relative">
                        <label className="block text-sm text-gray-500 mb-2">Company Name</label>
                        <div className="relative">
                            <NeuroInput 
                                name="companyName" 
                                value={companyName} 
                                onChange={(e) => { setCompanyName(e.target.value); handleFieldChange('companyName'); }}
                                placeholder={PLACEHOLDERS.companyName}
                                className={getAutoFillClass('companyName')}
                            />
                            {autoFilledFields.has('companyName') && <AutoFilledIndicator />}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Registration No</label>
                        <div className="relative">
                            <NeuroInput name="companyRegNo" value={companyRegNo} onChange={(e) => { setCompanyRegNo(e.target.value); handleFieldChange('companyRegNo'); }} placeholder={PLACEHOLDERS.companyRegNo} className={getAutoFillClass('companyRegNo')} />
                            {autoFilledFields.has('companyRegNo') && <AutoFilledIndicator />}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Address</label>
                        <div className="relative">
                            <NeuroTextarea name="companyAddress" value={companyAddress} onChange={(e) => { setCompanyAddress(e.target.value); handleFieldChange('companyAddress'); }} placeholder={PLACEHOLDERS.companyAddress} className={`resize-none ${getAutoFillClass('companyAddress')}`} />
                            {autoFilledFields.has('companyAddress') && <AutoFilledIndicator />}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Tel</label>
                            <NeuroInput name="companyTel" value={companyTel} onChange={(e) => { setCompanyTel(e.target.value); handleFieldChange('companyTel'); }} placeholder={PLACEHOLDERS.companyTel} className={getAutoFillClass('companyTel')} />
                         </div>
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Email</label>
                            <NeuroInput name="companyEmail" value={companyEmail} onChange={(e) => { setCompanyEmail(e.target.value); handleFieldChange('companyEmail'); }} placeholder={PLACEHOLDERS.companyEmail} className={getAutoFillClass('companyEmail')} />
                         </div>
                    </div>
                </div>
            </NeuroCard>
        </div>

        {/* Section 2: Voucher Details */}
        <div className="xl:col-span-8 space-y-6">
            <NeuroCard title="Voucher Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Voucher No.</label>
                        <NeuroInput name="voucherNo" value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} placeholder={PLACEHOLDERS.voucherNo} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Voucher Date</label>
                        <div className="relative">
                             <NeuroInput name="date" type="date" value={voucherDate} onChange={(e) => { setVoucherDate(e.target.value); handleFieldChange('voucherDate'); }} className={getAutoFillClass('voucherDate')} />
                             {autoFilledFields.has('voucherDate') && <AutoFilledIndicator />}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Category</label>
                        <div className="relative">
                            <NeuroSelect name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={getAutoFillClass('category')}>
                                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                            </NeuroSelect>
                        </div>
                    </div>
                    
                    {/* Payee Details Group */}
                    <div className="md:col-span-2 pt-4 border-t border-gray-200/50">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <User size={14} /> Payee & Payment Info
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-2">Payee Name</label>
                                <div className="relative">
                                    <NeuroInput name="payee" value={payee} onChange={(e) => { setPayee(e.target.value); handleFieldChange('payee'); }} placeholder={PLACEHOLDERS.payee} className={getAutoFillClass('payee')} />
                                    {autoFilledFields.has('payee') && <AutoFilledIndicator />}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-2">Payee IC/Reg</label>
                                <div className="relative">
                                    <NeuroInput name="payeeIc" value={payeeIc} onChange={(e) => { setPayeeIc(e.target.value); handleFieldChange('payeeIc'); }} placeholder={PLACEHOLDERS.payeeIc} className={getAutoFillClass('payeeIc')} />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm text-gray-500 mb-2">Payee Address</label>
                                <NeuroInput name="payeeAddress" value={payeeAddress} onChange={(e) => setPayeeAddress(e.target.value)} placeholder={PLACEHOLDERS.payeeAddress} />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-2">Payment Method</label>
                                <NeuroSelect name="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                    <option value="Online Transfer">Online Transfer / DuitNow</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Credit Card">Credit Card</option>
                                </NeuroSelect>
                            </div>
                             <div>
                                <label className="block text-sm text-gray-500 mb-2">Bank Name</label>
                                <NeuroInput name="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder={PLACEHOLDERS.bankName} disabled={paymentMethod === 'Cash'} className={paymentMethod === 'Cash' ? 'opacity-50' : ''} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm text-gray-500 mb-2">Payment Reference / Cheque No</label>
                                <NeuroInput name="paymentRef" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder={PLACEHOLDERS.paymentRef} disabled={paymentMethod === 'Cash'} className={paymentMethod === 'Cash' ? 'opacity-50' : ''} />
                            </div>
                        </div>
                    </div>

                    {/* Auth Details */}
                    <div className="md:col-span-2 pt-4 border-t border-gray-200/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-2">Prepared By</label>
                                <NeuroInput name="preparedBy" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} placeholder="Name" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-2">Approved By</label>
                                <NeuroInput name="approvedBy" value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Name" />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm text-gray-500">Description</label>
                            <div className="flex gap-2">
                                <NeuroButton onClick={toggleDictation} active={isDictating} className="!py-1.5 !px-3 text-xs">{isDictating ? 'Stop' : 'Dictate'}</NeuroButton>
                                <NeuroButton onClick={handleAISummary} disabled={loadingAI} className="!py-1.5 !px-3 text-xs">AI Summarize</NeuroButton>
                            </div>
                        </div>
                        <div className="relative">
                            <NeuroTextarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={PLACEHOLDERS.description} rows={2} className={getAutoFillClass('description')} />
                            {autoFilledFields.has('description') && <AutoFilledIndicator />}
                        </div>
                    </div>
                </div>
            </NeuroCard>

            {/* LHDN Tax Compliance Section */}
            <NeuroCard title="LHDN Tax Compliance" className="mt-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div>
                        <NeuroToggle 
                            label="Tax Deductible Expense" 
                            checked={isTaxDeductible} 
                            onChange={(checked) => { setIsTaxDeductible(checked); handleFieldChange('isTaxDeductible'); }}
                            className="mb-4"
                        />
                        <div className="text-xs text-gray-400 px-2 leading-relaxed">
                            <Info size={12} className="inline mr-1" />
                            Only expenses wholly and exclusively incurred in the production of gross income are deductible under Sec 33(1) ITA 1967.
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-500 mb-2">Tax Category</label>
                            <NeuroInput name="taxCategory" value={taxCategory} onChange={(e) => { setTaxCategory(e.target.value); handleFieldChange('taxCategory'); }} placeholder={PLACEHOLDERS.taxCategory} className={getAutoFillClass('taxCategory')} />
                        </div>
                         <div>
                            <label className="block text-sm text-gray-500 mb-2">Tax Code / Limit</label>
                            <NeuroInput name="taxCode" value={taxCode} onChange={(e) => { setTaxCode(e.target.value); handleFieldChange('taxCode'); }} placeholder={PLACEHOLDERS.taxCode} className={getAutoFillClass('taxCode')} />
                        </div>
                    </div>
                 </div>
            </NeuroCard>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        {/* Section 3: Line Items */}
        <div className="xl:col-span-2">
            <NeuroCard title="Line Items" className="h-full">
                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={item.id} className="group p-4 rounded-xl bg-white/30 border border-white/40 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                            <div className="hidden md:block text-gray-400 font-mono font-bold text-sm w-8">{index + 1}.</div>
                            <div className="w-full md:flex-1">
                                <label className="md:hidden text-xs text-gray-500 mb-1 block">Description</label>
                                <NeuroInput name={`item-${item.id}-description`} value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={WHITE_INPUT_THEME} />
                            </div>
                            <div className="w-full md:w-40 relative">
                                <label className="md:hidden text-xs text-gray-500 mb-1 block">Amount</label>
                                <NeuroInput name={`item-${item.id}-amount`} type="number" value={item.amount} onChange={(e) => updateItem(item.id, 'amount', e.target.value)} className={`text-right ${getAutoFillClass(`item-${item.id}-amount`)}`} />
                            </div>
                            <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={20} /></button>
                        </div>
                    ))}
                    <NeuroButton onClick={addItem} className="text-sm w-full md:w-auto"><Plus size={16} className="inline mr-2" /> Add Item</NeuroButton>
                </div>
            </NeuroCard>
        </div>

        {/* Section 4: Summary */}
        <div className="xl:col-span-1">
            <NeuroCard title="Summary" className="h-full flex flex-col justify-between">
                <div className="flex flex-col items-center justify-center flex-1 py-6 space-y-4">
                    <div className="text-sm text-gray-500 uppercase tracking-wider">Total Amount</div>
                    <div className="text-3xl sm:text-5xl font-bold text-gray-700">RM {total.toFixed(2)}</div>
                    <NeuroBadge color="text-blue-600 bg-blue-100/50 px-4 py-1">Draft</NeuroBadge>
                </div>
                
                <div className="pt-6 border-t border-gray-200/50 space-y-3">
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                         <NeuroButton onClick={handleExportExcel} className="w-full text-green-700 text-xs py-2 flex items-center justify-center gap-1 bg-green-50 hover:bg-green-100 border border-green-200">
                             <FileSpreadsheet size={14} /> Excel
                         </NeuroButton>
                         <NeuroButton onClick={handleExportWord} className="w-full text-blue-800 text-xs py-2 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 border border-blue-200">
                             <FileText size={14} /> Word
                         </NeuroButton>
                    </div>

                    <NeuroButton onClick={handlePreviewPDF} className="w-full text-gray-600 text-sm py-3 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300">
                        <Eye size={16} /> Preview PDF
                    </NeuroButton>
                    <NeuroButton onClick={handleDownloadPDF} className="w-full text-red-600 text-sm py-3 flex items-center justify-center gap-2">
                        <Download size={16} /> Download PDF
                    </NeuroButton>
                    <div className="flex gap-3">
                        <NeuroButton onClick={() => executeSaveVoucher('DRAFT')} disabled={saving} className="flex-1 text-gray-600 text-sm">Draft</NeuroButton>
                        <NeuroButton onClick={handleSaveClick} disabled={saving} className="flex-1 text-blue-600 text-sm font-bold">Save</NeuroButton>
                    </div>
                </div>
            </NeuroCard>
        </div>
      </div>

      {/* Section 5: Lost Receipt Details (Full AI Access) */}
      <NeuroCard title="Lost Receipt Details (Optional)">
          {/* LHDN Penalty Warning */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex gap-3">
             <div className="min-w-[24px] pt-0.5">
                 <AlertTriangle className="text-red-500" size={24} />
             </div>
             <div>
                 <h4 className="text-sm font-bold text-red-700 mb-1">Compliance Warning: Fabrication of Documents</h4>
                 <p className="text-xs text-gray-600 leading-relaxed">
                    Under <strong>Section 114 of the Income Tax Act 1967</strong>, any person who willfully evades or assists another person to evade tax by making false statements or fabricating false entries/documents is liable to a fine of <strong>RM1,000 to RM20,000</strong> or imprisonment up to <strong>3 years</strong>, or both, plus a penalty of <strong>300%</strong> of the tax undercharged. Ensure all reasons provided below are genuine.
                 </p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div>
                    <label className="block text-sm text-gray-500 mb-2">Original Expense Date</label>
                    <div className="relative">
                        <NeuroInput name="originalDate" type="date" value={originalDate} onChange={(e) => { setOriginalDate(e.target.value); handleFieldChange('originalDate'); }} className={getAutoFillClass('originalDate')} />
                        {autoFilledFields.has('originalDate') && <AutoFilledIndicator />}
                    </div>
               </div>
               <div>
                    <label className="block text-sm text-gray-500 mb-2">Evidence Type</label>
                    <NeuroInput name="evidenceType" placeholder={PLACEHOLDERS.evidenceType} value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className={WHITE_INPUT_THEME} />
               </div>
               <div>
                    <label className="block text-sm text-gray-500 mb-2">Evidence Reference</label>
                    <NeuroInput name="evidenceRef" placeholder={PLACEHOLDERS.evidenceRef} value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} className={WHITE_INPUT_THEME} />
               </div>
               <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm text-gray-500 mb-2">Reason for Lost Receipt</label>
                    <NeuroTextarea name="lostReason" placeholder={PLACEHOLDERS.lostReason} value={lostReason} onChange={(e) => setLostReason(e.target.value)} rows={2} className={`resize-none ${WHITE_INPUT_THEME}`} />
               </div>
          </div>
      </NeuroCard>
      
      {/* PDF Preview Modal */}
      {showPdfPreview && previewPdfUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <div className="absolute inset-0" onClick={() => setShowPdfPreview(false)}></div>
             <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col relative z-10 shadow-2xl">
                 <div className="flex justify-between items-center p-4 border-b">
                     <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2"><Printer size={18} /> Print Preview</h3>
                     <button onClick={() => setShowPdfPreview(false)}><X size={24} /></button>
                 </div>
                 <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
                     <iframe src={previewPdfUrl} className="w-full h-full rounded-lg" title="PDF Preview"></iframe>
                 </div>
                 <div className="p-4 border-t flex justify-end gap-3 bg-white rounded-b-2xl">
                     <NeuroButton onClick={() => setShowPdfPreview(false)} className="text-sm">Close</NeuroButton>
                     <NeuroButton onClick={handleDownloadPDF} className="text-sm text-green-600">Download PDF</NeuroButton>
                 </div>
             </div>
          </div>
      )}

      {/* OCR Error Modal */}
      {errorModal.show && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="absolute inset-0" onClick={() => setErrorModal({ ...errorModal, show: false })}></div>
            <NeuroCard className="w-full max-w-sm relative z-10 shadow-2xl border-2 border-red-100 text-center bg-[#e0e5ec]">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">{errorModal.title || "Scan Failed"}</h3>
                    <p className="text-sm text-gray-500 mb-6 px-2">{errorModal.message}</p>
                    <div className="flex gap-3 justify-center">
                        <NeuroButton onClick={() => setErrorModal({ ...errorModal, show: false })} className="text-sm">Dismiss</NeuroButton>
                    </div>
            </NeuroCard>
            </div>
      )}

      {/* Batch Review Modal */}
      {showBatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
             <div className="absolute inset-0" onClick={() => !isBatchProcessing && setShowBatchModal(false)}></div>
             <NeuroCard className="w-full max-w-4xl h-[80vh] flex flex-col relative z-10 shadow-2xl p-0 overflow-hidden bg-[#e0e5ec]">
                 <div className="flex justify-between items-center p-4 border-b border-gray-300/50">
                     <h3 className="text-lg font-bold text-gray-700">Batch Processing Queue</h3>
                     <button onClick={() => !isBatchProcessing && setShowBatchModal(false)}><X size={24} /></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4">
                     <div className="grid gap-3">
                         {batchQueue.map((item) => (
                             <div key={item.id} className="bg-[#e0e5ec] rounded-xl p-3 shadow-sm flex gap-4 items-center">
                                 <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden relative">
                                     <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                     {item.status === 'processing' && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                                     {item.status === 'completed' && <div className="absolute bottom-0 right-0 bg-green-500 p-1"><CheckCircle2 size={12} className="text-white" /></div>}
                                 </div>
                                 <div className="flex-1">
                                     <span className="text-sm font-medium text-gray-700 block">{item.file.name}</span>
                                     {item.status === 'completed' && (
                                         <NeuroButton onClick={() => loadFromBatch(item)} className="!py-1 !px-2 text-xs mt-2">Load Data</NeuroButton>
                                     )}
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             </NeuroCard>
          </div>
      )}

      {/* OCR Confirmation Dialog */}
      {showOCRConfirm && extractedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="absolute inset-0" onClick={() => setShowOCRConfirm(false)}></div>
            <NeuroCard className="w-full max-w-lg relative z-10 shadow-2xl border-2 border-purple-100 max-h-[90vh] overflow-y-auto bg-[#e0e5ec]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Verify Extraction</h3>
                    <button onClick={() => setShowOCRConfirm(false)}><X size={18} /></button>
                </div>
                
                <div className="space-y-4 mb-8">
                     <NeuroInput value={extractedData.payeeName || ''} onChange={(e) => handleExtractedDataChange('payeeName', e.target.value)} placeholder="Merchant Name" />
                     <NeuroInput type="date" value={extractedData.date || ''} onChange={(e) => handleExtractedDataChange('date', e.target.value)} />
                     <NeuroInput type="number" value={extractedData.totalAmount || ''} onChange={(e) => handleExtractedDataChange('totalAmount', parseFloat(e.target.value))} />
                     
                     <div className="border-t pt-4 mt-4">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Bill To</h4>
                        <NeuroInput value={extractedData.companyName || ''} onChange={(e) => handleExtractedDataChange('companyName', e.target.value)} placeholder="Company Name" />
                     </div>
                </div>
                
                <div className="flex gap-4 justify-end">
                    <NeuroButton onClick={() => setShowOCRConfirm(false)}>Cancel</NeuroButton>
                    <NeuroButton onClick={handleApplyOCRConfirm} className="text-white bg-purple-600">Apply Details</NeuroButton>
                </div>
            </NeuroCard>
        </div>
      )}

      {/* Save Confirmation Dialog */}
      {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="absolute inset-0" onClick={() => setShowConfirmDialog(false)}></div>
            <NeuroCard className="w-full max-w-md relative z-10 shadow-2xl border-2 border-blue-100 text-center bg-[#e0e5ec]">
                 <h3 className="text-lg font-bold text-gray-700 mb-2">Confirm Voucher Details</h3>
                 <div className="bg-[#e0e5ec] rounded-xl p-4 mb-6 text-left border border-gray-100/50">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <div className="text-gray-500 font-medium">Payee:</div><div className="font-bold text-right">{payee || "-"}</div>
                        <div className="text-gray-500 font-medium">Date:</div><div className="font-bold text-right">{voucherDate || "-"}</div>
                        <div className="text-gray-500 font-medium">Total:</div><div className="font-bold text-blue-600 text-right">RM {total.toFixed(2)}</div>
                    </div>
                 </div>
                 <div className="flex gap-3 justify-center">
                     <NeuroButton onClick={() => setShowConfirmDialog(false)}>Back</NeuroButton>
                     <NeuroButton onClick={() => executeSaveVoucher('COMPLETED')} className="text-white bg-blue-600">Confirm & Save</NeuroButton>
                 </div>
            </NeuroCard>
          </div>
      )}
    </div>
  );
};