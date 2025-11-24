import React, { useState, useRef, useEffect } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroBadge, NeuroTextarea, NeuroSelect } from '../components/NeuroComponents';
import { generateFastSummary, generateSpeech, extractReceiptData, getLiveClient } from '../services/geminiService';
import { createPcmBlob } from '../services/audioUtils';
import { Sparkles, Play, Plus, Trash2, Save, Upload, X, Calendar, FileText, AlertTriangle, Building2, User, ScanLine, CheckCircle2, Mic, MicOff, Tag, Info, Image as ImageIcon, Languages, Download, Eye, Mail, Phone, Printer, ShieldCheck, FileCheck, HelpCircle, ExternalLink, Layers, Loader2, ArrowRight, Pencil, Coins, FileSpreadsheet } from 'lucide-react';
import { VoucherItem, SUPPORTED_LANGUAGES } from '../types';
import { Modality, LiveServerMessage } from '@google/genai';
import { jsPDF } from "jspdf";
import { generateDetailedVoucherExcel } from '../lib/export/excel-generator';

// Simple Number to Words fallback if lib missing (Mock implementation for this context)
const toWords = (amount: number) => {
    return `RINGGIT MALAYSIA ${amount.toFixed(2)} ONLY`; 
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
    voucherNo: "PV-YYYY-XXXX",
    description: "e.g., Purchase of A4 Paper (Avoid 'Misc')",
    evidenceType: "e.g., Tax Invoice / Receipt",
    evidenceRef: "e.g., INV-2024-001",
    lostReason: "Brief explanation for why the original receipt is missing...",
    taxCategory: "e.g., Entertainment (Restricted)",
    taxCode: "e.g., PU(A) 400 Vol. 64",
    taxReason: "e.g., Wholly and exclusively incurred in the production of gross income."
};

interface BatchItem {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    data?: any;
    previewUrl: string;
    error?: string;
}

const AutoFilledIndicator = ({ className }: { className?: string }) => (
    <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 animate-pulse z-10 pointer-events-auto cursor-help ${className}`} title="Auto-filled by AI">
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

  // Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const dictationCleanupRef = useRef<() => void>(() => {});

  const fileInputRef = useRef<HTMLInputElement>(null); // For Receipt OCR
  const batchInputRef = useRef<HTMLInputElement>(null); // For Batch OCR
  const companyDocInputRef = useRef<HTMLInputElement>(null); // For Company Doc OCR
  const logoInputRef = useRef<HTMLInputElement>(null); // For Company Logo

  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

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
            "Training & Development"
        ];
        // Mock API call simulation
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
    autoFilledFields.has(field) ? "ring-2 ring-purple-400/40 bg-purple-50/20" : "";

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
    
    // Clear auto-fill status if user modifies the amount or description
    if (field === 'amount' || field === 'description') {
        const key = field === 'amount' ? `item-${id}-amount` : 'description'; 
        handleFieldChange(`item-${id}-amount`);
        if (field === 'description' && items.length === 1) handleFieldChange('description');
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

  // Generic handler for scanning receipts or company docs
  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorModal({ show: false, message: '' }); // Reset error
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate File Type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!validTypes.includes(file.type)) {
        setErrorModal({ show: true, title: "Unsupported File", message: "Unsupported file type. Please upload a JPEG, PNG, or WebP image." });
        // Clear inputs
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (companyDocInputRef.current) companyDocInputRef.current.value = '';
        return;
    }

    // Validate File Size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        setErrorModal({ show: true, title: "File Too Large", message: "File size too large. Please upload an image smaller than 10MB." });
        // Clear inputs
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (companyDocInputRef.current) companyDocInputRef.current.value = '';
        return;
    }

    setScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        try {
            const base64String = (reader.result as string).split(',')[1];
            // Pass the selected language code for context
            const data = await extractReceiptData(base64String, ocrLanguage);
            
            if (!data || Object.keys(data).length === 0) {
                // If service returns empty, treat as extraction failure
                throw new Error("EMPTY_DATA");
            }

            // Store extracted data for confirmation
            setExtractedData(data);
            setShowOCRConfirm(true);
            
        } catch (error: any) {
            console.error(error);
            
            let message = "An error occurred while scanning the receipt.";
            let title = "Scan Failed";
            const errStr = error.toString().toLowerCase();
            const errMsg = (error.message || "").toLowerCase();

            if (errMsg.includes("parsing_failed") || errMsg === "empty_data") {
                title = "Unclear Image";
                message = "We couldn't extract any text. The image might be too blurry, dark, or not a valid receipt. Please try again with a clearer photo.";
            } else if (errMsg.includes("no_response_text") || errStr.includes("safety")) {
                title = "Processing Failed";
                message = "The AI could not process this image. It may be flagged by safety filters or contain unrecognized content.";
            } else if (errMsg.includes("api_key") || errStr.includes("403") || errStr.includes("401")) {
                title = "Authentication Error";
                message = "API Authorization failed. Please ensure your API Key is correctly configured in Settings.";
            } else if (errStr.includes("failed to fetch") || errStr.includes("network")) {
                title = "Connection Error";
                message = "We couldn't reach the server. Please check your internet connection.";
            } else if (errStr.includes("503") || errStr.includes("overloaded")) {
                title = "Service Busy";
                message = "The AI service is currently experiencing high traffic. Please try again in a moment.";
            } else if (errStr.includes("400")) {
                title = "Invalid Image";
                message = "The image format seems corrupted or unsupported by the AI model.";
            } else if (errStr.includes("quota")) {
                 title = "Quota Exceeded";
                 message = "You have exceeded your API usage quota. Please check your billing details.";
            }

            setErrorModal({ show: true, message, title });
        } finally {
            setScanning(false);
        }
    };
    reader.onerror = () => {
        setErrorModal({ show: true, title: "Read Error", message: "Failed to read the file from your device. Please try again." });
        setScanning(false);
    };
    reader.readAsDataURL(file);
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (companyDocInputRef.current) companyDocInputRef.current.value = '';
  };

  // Batch Scan Logic
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
      
      // Reset input
      if (batchInputRef.current) batchInputRef.current.value = '';
      
      // Trigger processing
      processBatchQueue([...batchQueue, ...newItems]);
  };

  const processBatchQueue = async (queue: BatchItem[]) => {
      if (isBatchProcessing) return;
      setIsBatchProcessing(true);

      const pendingItems = queue.filter(item => item.status === 'pending');
      
      // Process chunks of 3 to avoid overwhelming browser/api
      const CHUNK_SIZE = 3;
      for (let i = 0; i < pendingItems.length; i += CHUNK_SIZE) {
          const chunk = pendingItems.slice(i, i + CHUNK_SIZE);
          
          await Promise.all(chunk.map(async (item) => {
              // Update status to processing
              setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing' } : q));

              try {
                  // Read file
                  const base64String = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                         const result = reader.result as string;
                         resolve(result.split(',')[1]);
                      };
                      reader.onerror = reject;
                      reader.readAsDataURL(item.file);
                  });

                  // Call API
                  const data = await extractReceiptData(base64String, ocrLanguage);
                  
                  if (!data || Object.keys(data).length === 0) throw new Error("Empty Data");

                  // Update status to completed
                  setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'completed', data } : q));

              } catch (err: any) {
                  console.error(`Batch processing failed for ${item.id}`, err);
                  setBatchQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'failed', error: err.message || "Failed" } : q));
              }
          }));
      }

      setIsBatchProcessing(false);
  };

  const loadFromBatch = (item: BatchItem) => {
      if (!item.data) return;
      applyOCRData(item.data);
      setShowBatchModal(false);
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

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompanyLogo(null);
    if (logoInputRef.current) {
        logoInputRef.current.value = '';
    }
  };

  const applyOCRData = (overrideData?: any) => {
    // If specific data is passed (e.g. from Batch), use it. Otherwise use the single-scan extractedData.
    const sourceData = overrideData || extractedData;

    if (!sourceData) return;

    // We track which fields are auto-filled to allow styling
    const newAutoFilled = new Set<string>(autoFilledFields);

    /**
     * Helper: Determine if we should update a field based on strict user constraints.
     * Rule 1: Always update if current value is empty.
     * Rule 2: Always update if current value matches the placeholder.
     */
    const shouldUpdate = (currentVal: string, placeholder?: string) => {
        const val = (currentVal || '').trim();
        const ph = (placeholder || '').trim();

        // 1. If currently empty, overwrite.
        if (val.length === 0) return true;
        
        // 2. If matches placeholder (treat as empty/default state). Case-insensitive check.
        if (ph.length > 0 && val.toLowerCase() === ph.toLowerCase()) return true;
        
        return false;
    };

    const applyIfEligible = (currentValue: string, newValue: any, fieldKey: string, setter: (val: any) => void, placeholder?: string) => {
        if (newValue && shouldUpdate(currentValue, placeholder)) {
            setter(newValue);
            newAutoFilled.add(fieldKey);
        }
    };

    // Sanity Check: Ensure extracted Company Info (Bill To) isn't just the Payee (Merchant) repeated.
    const isCompanySameAsPayee = sourceData.companyName && sourceData.payeeName && (
        sourceData.companyName.toLowerCase().trim() === sourceData.payeeName.toLowerCase().trim() ||
        sourceData.companyName.toLowerCase().includes(sourceData.payeeName.toLowerCase())
    );

    if (isCompanySameAsPayee) {
        console.warn("OCR Warning: Extracted Company Name is identical to Payee Name. Skipping Company Auto-fill.");
    }

    // Pre-fill Payee
    applyIfEligible(payee, sourceData.payeeName, 'payee', setPayee, PLACEHOLDERS.payee);
    applyIfEligible(payeeIc, sourceData.payeeId, 'payeeIc', setPayeeIc, PLACEHOLDERS.payeeIc);
    
    // Apply Date to both Voucher Date and Original Expense Date
    if (sourceData.date) {
        if (shouldUpdate(voucherDate)) {
            setVoucherDate(sourceData.date);
            newAutoFilled.add('voucherDate');
        }
        
        if (shouldUpdate(originalDate)) {
            setOriginalDate(sourceData.date); 
            newAutoFilled.add('originalDate');
        }
    }
    
    // Pre-fill Company - Only if it looks valid and distinct from Payee
    if (!isCompanySameAsPayee) {
        // Essential Company Info
        applyIfEligible(companyName, sourceData.companyName, 'companyName', setCompanyName, PLACEHOLDERS.companyName);
        applyIfEligible(companyRegNo, sourceData.companyRegNo, 'companyRegNo', setCompanyRegNo, PLACEHOLDERS.companyRegNo);
        applyIfEligible(companyAddress, sourceData.companyAddress, 'companyAddress', setCompanyAddress, PLACEHOLDERS.companyAddress);

        // Contact Information
        applyIfEligible(companyTel, sourceData.companyTel, 'companyTel', setCompanyTel, PLACEHOLDERS.companyTel);
        applyIfEligible(companyEmail, sourceData.companyEmail, 'companyEmail', setCompanyEmail, PLACEHOLDERS.companyEmail);
        applyIfEligible(companyFax, sourceData.companyFax, 'companyFax', setCompanyFax, PLACEHOLDERS.companyFax);
    }

    // Intelligent Item & Amount Handling
    if (sourceData.totalAmount) {
        if (items.length === 0) {
            const newItemId = Date.now().toString();
            setItems([{
                id: newItemId,
                description: 'Receipt Import',
                amount: sourceData.totalAmount
            }]);
            newAutoFilled.add(`item-${newItemId}-amount`);
        } 
        else if (items.length === 1) {
            const item = items[0];
            const amountKey = `item-${item.id}-amount`;
            
            // Check if description is effectively empty
            const isDescEmpty = !item.description || item.description === PLACEHOLDERS.description || item.description.trim() === '';

            // Check if Amount is editable (only if 0)
            const isAmountEditable = Number(item.amount) === 0;

            if (isAmountEditable) {
                 const updatedItem = { ...item, amount: sourceData.totalAmount };
                 newAutoFilled.add(amountKey);
                 
                 // Only add default description if completely empty
                 if (isDescEmpty) {
                     updatedItem.description = 'Receipt Import';
                 }
                 setItems([updatedItem]);
            }
        }
    }

    // Attempt to map Tax Category to dropdown
    if (sourceData.taxCategory) {
        const matchedCat = categories.find(c => 
            c.toLowerCase().includes(sourceData.taxCategory.toLowerCase()) || 
            sourceData.taxCategory.toLowerCase().includes(c.toLowerCase())
        );
        
        if (matchedCat) {
             // Treat the first category (Default) as a placeholder effectively to allow smart switching
             applyIfEligible(category, matchedCat, 'category', setCategory, categories[0]);
        }

        // Also populate specific Tax Category field
        applyIfEligible(taxCategory, sourceData.taxCategory, 'taxCategory', setTaxCategory, PLACEHOLDERS.taxCategory);
    }

    // Map Tax Reason or Description
    if (sourceData.taxReason) {
         applyIfEligible(description, sourceData.taxReason, 'description', setDescription, PLACEHOLDERS.description);
    }

    // --- LHDN Tax Compliance Fields ---
    if (sourceData.taxDeductible !== undefined && !isTaxDeductible) {
        setIsTaxDeductible(sourceData.taxDeductible);
        newAutoFilled.add('isTaxDeductible');
    }

    if (sourceData.taxCode || sourceData.taxLimit) {
        const combinedCode = [sourceData.taxCode, sourceData.taxLimit].filter(Boolean).join(' - ');
        applyIfEligible(taxCode, combinedCode, 'taxCode', setTaxCode, PLACEHOLDERS.taxCode);
    }

    if (sourceData.taxReason) {
        applyIfEligible(taxReason, sourceData.taxReason, 'taxReason', setTaxReason, PLACEHOLDERS.taxReason);
    }

    setAutoFilledFields(newAutoFilled);
    // If it was a single scan (no override), close that modal
    if (!overrideData) {
        setShowOCRConfirm(false);
        setExtractedData(null);
    }
  };

  const handleExtractedDataChange = (field: string, value: any) => {
    if (!extractedData) return;
    setExtractedData({
        ...extractedData,
        [field]: value
    });
  };

  const handleSaveClick = () => {
    const errors: string[] = [];

    // LHDN Compliance: Issuer Details
    if (!companyName.trim()) errors.push("Company Name is required.");
    if (!companyRegNo.trim()) errors.push("Company Registration No is required for LHDN audit trails.");

    // LHDN Compliance: Payee Details
    if (!payee.trim()) errors.push("Payee Name is required.");
    
    // Basic Fields
    if (!voucherDate) errors.push("Voucher Date is required.");

    // Line Items Validation
    if (items.length === 0) {
        errors.push("At least one item is required.");
    } else {
        const currentTotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        if (currentTotal <= 0) errors.push("Total Amount must be greater than zero.");
    }

    if (errors.length > 0) {
        alert("Compliance Validation Failed (LHDN):\n\n- " + errors.join("\n- "));
        return;
    }

    setShowConfirmDialog(true);
  };

  // Generate PDF Logic (A4 LHDN Standard)
  const generatePDF = (mode: 'download' | 'preview' = 'download') => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // A4 Dimensions: 210 x 297 mm
        // Margins: 20mm
        const leftM = 20;
        const rightM = 190;
        const width = 170; // 210 - 20 - 20
        
        // --- 1. Letterhead Section (q1 - q5) ---
        let startY = 15;

        // Q1: Company Logo (Top Left)
        if (companyLogo) {
            try {
                const imgProps = doc.getImageProperties(companyLogo);
                const ratio = imgProps.width / imgProps.height;
                const h = 25; // Fixed height
                const w = h * ratio;
                doc.addImage(companyLogo, imgProps.fileType, leftM, startY, w, h);
            } catch (e) {
                console.warn("Logo add failed", e);
            }
        }

        // Q2: Company Name (Right of Logo, or Left if no logo)
        const textX = companyLogo ? leftM + 30 : leftM; // 25mm for logo + 5mm gap
        doc.setTextColor(0, 0, 0); // Black
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(companyName.toUpperCase() || "COMPANY NAME", textX, startY + 6);
        
        // Q3: Registration No (1 space below Q2)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`(Reg No: ${companyRegNo || 'Pending'})`, textX, startY + 11);

        // Q4: Address (Below Q3)
        // Positioned 5mm below Reg No line
        doc.setFontSize(9);
        const splitAddress = doc.splitTextToSize(companyAddress || "", 100);
        doc.text(splitAddress, textX, startY + 16);
        
        const addressHeight = splitAddress.length * 4; 
        
        // Q5: Contact Info (Below Q4)
        // Positioned below the variable height address
        let contactY = startY + 16 + addressHeight; 
        const contactParts = [];
        if (companyTel) contactParts.push(`Tel: ${companyTel}`);
        if (companyFax) contactParts.push(`Fax: ${companyFax}`);
        if (companyEmail) contactParts.push(`Email: ${companyEmail}`);
        
        if (contactParts.length > 0) {
            doc.text(contactParts.join(" | "), textX, contactY);
        }

        // Line Separator
        const headerEnd = Math.max(startY + 25, contactY + 5);
        doc.setLineWidth(0.5);
        doc.line(leftM, headerEnd, rightM, headerEnd);

        // --- 2. Title & Voucher No ---
        let y = headerEnd + 15;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("PAYMENT VOUCHER", 105, y, { align: 'center' }); // Centered
        
        y += 10;

        // Voucher Meta Table Box
        // Left Side: Payee
        doc.setFontSize(10);
        doc.text("Pay To:", leftM, y);
        doc.setFont("helvetica", "normal");
        doc.text(payee || "__________________", leftM + 20, y);
        
        doc.setFont("helvetica", "bold");
        doc.text("IC/Reg No:", leftM, y + 6);
        doc.setFont("helvetica", "normal");
        doc.text(payeeIc || "__________________", leftM + 20, y + 6);

        // Right Side: Voucher Details (Boxed usually)
        const boxX = 130;
        const boxY = y - 5;
        const boxW = 60;
        const boxH = 18;
        
        doc.rect(boxX, boxY, boxW, boxH);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Voucher No:", boxX + 2, boxY + 5);
        doc.text("Date:", boxX + 2, boxY + 12);
        
        doc.setFont("helvetica", "normal");
        doc.text(voucherNo || "PV-XXXX", boxX + 25, boxY + 5);
        doc.text(voucherDate || "DD/MM/YYYY", boxX + 25, boxY + 12);

        // --- 3. Items Table ---
        y += 20;
        
        // Table Header
        const col1 = leftM;       // No.
        const col2 = leftM + 15;  // Description
        const col3 = rightM - 35; // Amount
        
        doc.setFillColor(230, 230, 230);
        doc.rect(leftM, y, width, 8, 'F'); // Header bg
        doc.rect(leftM, y, width, 8, 'S'); // Header border
        
        doc.setFont("helvetica", "bold");
        doc.text("No.", col1 + 2, y + 5.5);
        doc.text("Description", col2 + 2, y + 5.5);
        doc.text("Amount (RM)", rightM - 2, y + 5.5, { align: "right" });
        
        y += 8;
        
        // Items
        doc.setFont("helvetica", "normal");
        let itemY = y;
        
        items.forEach((item, i) => {
            const desc = item.description || "Item description";
            const splitDesc = doc.splitTextToSize(desc, 120);
            const rowHeight = Math.max(7, splitDesc.length * 5);
            
            // Draw row borders (optional, simpler to just list)
            doc.text(`${i+1}`, col1 + 2, itemY + 5);
            doc.text(splitDesc, col2 + 2, itemY + 5);
            doc.text(Number(item.amount).toFixed(2), rightM - 2, itemY + 5, { align: "right" });
            
            itemY += rowHeight;
        });

        // Fill to minimum height if needed
        if (itemY < y + 50) itemY = y + 50;
        
        // Close table Box
        doc.rect(leftM, y, width, itemY - y); // Outer border for items
        
        // --- 4. Totals ---
        y = itemY;
        doc.rect(leftM, y, width, 10); // Total box
        
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL", 140, y + 6.5);
        doc.text(total.toFixed(2), rightM - 2, y + 6.5, { align: "right" });
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text(`Ringgit Malaysia: ${toWords(total)}`, leftM + 2, y + 6.5);

        // --- 5. Payment Details (Cheque/Cash/Bank) - Optional usually but good for standard ---
        y += 15;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Payment Mode:  [  ] Cash    [  ] Cheque    [  ] Online Transfer", leftM, y);
        doc.text("Bank/Cheque No: __________________________", leftM + 90, y);

        // --- 6. Signatures (LHDN Standard Requirement) ---
        y += 20;
        const sigY = y + 25;
        const sigW = 50;
        
        doc.setLineWidth(0.2);
        
        // Prepared By
        doc.line(leftM, sigY, leftM + sigW, sigY);
        doc.setFont("helvetica", "bold");
        doc.text("Prepared By", leftM, sigY + 5);
        doc.setFont("helvetica", "normal");
        doc.text(preparedBy || "(Name)", leftM, sigY + 10);
        
        // Approved By
        const centerSigX = leftM + 60;
        doc.line(centerSigX, sigY, centerSigX + sigW, sigY);
        doc.setFont("helvetica", "bold");
        doc.text("Approved By", centerSigX, sigY + 5);
        doc.setFont("helvetica", "normal");
        doc.text(approvedBy || "(Name)", centerSigX, sigY + 10);
        
        // Received By
        const rightSigX = rightM - sigW;
        doc.line(rightSigX, sigY, rightSigX + sigW, sigY);
        doc.setFont("helvetica", "bold");
        doc.text("Received By", rightSigX, sigY + 5);
        doc.setFont("helvetica", "normal");
        doc.text("(Signature & Chop)", rightSigX, sigY + 10);
        
        // Footer
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text("Computer Generated Voucher - LHDN Compliant Format", 105, 290, { align: "center" });

        if (mode === 'download') {
            doc.save(`${voucherNo || 'payment_voucher'}.pdf`);
        } else {
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            setPreviewPdfUrl(url);
            setShowPdfPreview(true);
        }

    } catch (error) {
        console.error("PDF Generation Error:", error);
        alert("Failed to generate PDF. Check logo format.");
    }
  };

  const handleDownloadPDF = () => generatePDF('download');
  const handlePreviewPDF = () => generatePDF('preview');

  const handleExportExcel = () => {
    try {
        const voucherData = {
            companyName, companyRegNo, companyAddress, companyTel,
            voucherNo, date: voucherDate, payee, payeeIc, category,
            items, total, preparedBy, approvedBy
        };
        const blob = generateDetailedVoucherExcel(voucherData);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${voucherNo || 'voucher'}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Excel Export Error", e);
        alert("Failed to export Excel.");
    }
  };

  const handleExportWord = () => {
     const content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${voucherNo}</title></head>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="text-align:center">${companyName}</h2>
            <p style="text-align:center; font-size:10pt">${companyAddress}<br/>Reg: ${companyRegNo}</p>
            <hr/>
            <h1 style="text-align:center">PAYMENT VOUCHER</h1>
            <table style="width:100%">
                <tr><td><strong>Voucher No:</strong> ${voucherNo}</td><td align="right"><strong>Date:</strong> ${voucherDate}</td></tr>
                <tr><td><strong>Payee:</strong> ${payee}</td><td align="right"><strong>IC:</strong> ${payeeIc}</td></tr>
            </table>
            <br/>
            <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse;">
                <tr style="background-color:#eee;"><th>No</th><th>Description</th><th>Amount (RM)</th></tr>
                ${items.map((item, i) => `<tr><td align="center">${i+1}</td><td>${item.description}</td><td align="right">${Number(item.amount).toFixed(2)}</td></tr>`).join('')}
                <tr><td colspan="2" align="right"><strong>TOTAL</strong></td><td align="right"><strong>${total.toFixed(2)}</strong></td></tr>
            </table>
            <br/><br/>
            <table style="width:100%">
                <tr>
                    <td align="center">________________<br/>Prepared By<br/>${preparedBy}</td>
                    <td align="center">________________<br/>Approved By<br/>${approvedBy}</td>
                    <td align="center">________________<br/>Received By</td>
                </tr>
            </table>
        </body></html>
     `;
     const blob = new Blob([content], { type: 'application/msword' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `${voucherNo || 'voucher'}.doc`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
  };

  const executeSaveVoucher = async (status: 'DRAFT' | 'COMPLETED' = 'COMPLETED') => {
    setShowConfirmDialog(false);
    setSaving(true);
    // Mock save logic for demo
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    alert("Voucher Saved (Mock)!");
  };

  return (
    <div className="space-y-6 md:space-y-8 relative max-w-7xl mx-auto pb-12 p-2 md:p-0">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-8">
        <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-700 tracking-tight">New Cash Voucher</h2>
            <p className="text-sm text-gray-500 mt-1">Generate a new payment voucher with AI assistance</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
             {/* Language Selector for OCR */}
             <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200/50 shadow-sm w-full sm:w-auto min-w-[140px] h-[42px]">
                <Languages size={16} className="text-gray-400 shrink-0" />
                <div className="flex-1">
                    <select 
                        value={ocrLanguage} 
                        onChange={(e) => setOcrLanguage(e.target.value)}
                        className="w-full bg-transparent text-xs text-gray-600 font-medium outline-none border-none focus:ring-0 cursor-pointer appearance-none truncate"
                    >
                        {SUPPORTED_LANGUAGES.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={handleScan} 
                />
                
                {/* Batch Scan Input */}
                <input 
                    type="file" 
                    ref={batchInputRef} 
                    className="hidden" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={handleBatchScan}
                    multiple
                />

                <NeuroButton onClick={() => batchInputRef.current?.click()} disabled={scanning || isBatchProcessing} className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm whitespace-nowrap min-w-[140px]">
                    <Layers size={16} className={isBatchProcessing ? "animate-pulse text-purple-500" : "text-purple-600"} />
                    {isBatchProcessing ? 'Processing...' : 'Batch Scan'}
                </NeuroButton>

                <NeuroButton onClick={() => fileInputRef.current?.click()} disabled={scanning} className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm whitespace-nowrap min-w-[140px]">
                    <Upload size={16} className={scanning ? "animate-bounce text-blue-500" : "text-blue-600"} />
                    {scanning ? 'Scanning...' : 'Upload Receipt'}
                </NeuroButton>
                <NeuroButton onClick={handleReadAloud} disabled={playingAudio} className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm whitespace-nowrap min-w-[130px]">
                    <Play size={16} className={playingAudio ? "text-green-500" : "text-green-500"} />
                    {playingAudio ? 'Reading...' : 'Read Aloud'}
                </NeuroButton>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
        
        {/* Section 1: Company Information (Letterhead) */}
        <div className="xl:col-span-4 h-full">
            <NeuroCard className="h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-600 uppercase tracking-wider">Company Information</h3>
                    <button 
                        onClick={() => companyDocInputRef.current?.click()}
                        className="text-xs flex items-center gap-2 text-blue-500 hover:text-blue-700 transition-colors bg-blue-50 px-2 py-1 rounded-md"
                        title="Upload business card or letterhead to auto-fill"
                        disabled={scanning}
                    >
                        {scanning ? <Sparkles size={14} className="animate-spin" /> : <ScanLine size={14} />}
                        Auto-fill
                    </button>
                    <input 
                        type="file" 
                        ref={companyDocInputRef}
                        onChange={handleScan}
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                    />
                </div>

                <div className="space-y-4">
                    {/* Logo Section */}
                    <div className="flex flex-col items-center justify-center mb-6">
                         <div className="relative w-28 h-28 group">
                            <div className={`w-full h-full rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed transition-all ${
                                companyLogo ? 'border-purple-200 bg-white' : 'border-gray-300 bg-gray-50/50 hover:border-purple-300'
                            }`}>
                                {companyLogo ? (
                                    <img src={companyLogo} alt="Company Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <div className="text-center text-gray-400 p-2 cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                        <ImageIcon size={28} className="mx-auto mb-2 opacity-50" />
                                        <span className="text-[10px] uppercase font-bold tracking-wider block">Upload Logo</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Hover Overlay for Change */}
                            {companyLogo && (
                                <div 
                                    className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer backdrop-blur-[1px]"
                                    onClick={() => logoInputRef.current?.click()}
                                >
                                     <span className="text-xs font-medium">Change</span>
                                </div>
                            )}

                            {/* Remove Button */}
                            {companyLogo && (
                                <button 
                                    onClick={handleRemoveLogo}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors z-20"
                                    title="Remove Logo"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            )}

                            <input 
                                ref={logoInputRef}
                                type="file" 
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                         </div>
                         <p className="text-[10px] text-gray-400 mt-2 text-center">
                            Position: Top Left
                         </p>
                    </div>

                    <div className="relative">
                        <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                            <Building2 size={14} /> Company Name
                        </label>
                        <div className="relative">
                            <NeuroInput 
                                value={companyName} 
                                onChange={(e) => { setCompanyName(e.target.value); handleFieldChange('companyName'); }}
                                placeholder={PLACEHOLDERS.companyName}
                                className={`pr-10 ${getAutoFillClass('companyName')}`}
                            />
                            {autoFilledFields.has('companyName') && <AutoFilledIndicator />}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Registration No</label>
                        <div className="relative">
                            <NeuroInput 
                                value={companyRegNo} 
                                onChange={(e) => { setCompanyRegNo(e.target.value); handleFieldChange('companyRegNo'); }}
                                placeholder={PLACEHOLDERS.companyRegNo}
                                className={`pl-10 pr-10 ${getAutoFillClass('companyRegNo')}`}
                            />
                            <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            {autoFilledFields.has('companyRegNo') && <AutoFilledIndicator />}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Address</label>
                        <div className="relative">
                            <NeuroTextarea 
                                rows={3}
                                value={companyAddress} 
                                onChange={(e) => { setCompanyAddress(e.target.value); handleFieldChange('companyAddress'); }}
                                placeholder={PLACEHOLDERS.companyAddress} 
                                className={`resize-none ${getAutoFillClass('companyAddress')}`}
                            />
                            {autoFilledFields.has('companyAddress') && <div className="absolute right-3 top-3"><Sparkles size={16} className="text-purple-500 animate-pulse opacity-70" /></div>}
                        </div>
                    </div>
                    
                    {/* Contact Details (q5) */}
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Tel</label>
                            <div className="relative">
                                <NeuroInput 
                                    value={companyTel}
                                    onChange={(e) => { setCompanyTel(e.target.value); handleFieldChange('companyTel'); }}
                                    placeholder={PLACEHOLDERS.companyTel}
                                    className={`text-sm pl-8 pr-2 py-2 ${getAutoFillClass('companyTel')}`}
                                />
                                <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                {autoFilledFields.has('companyTel') && <div className="absolute right-1 top-1/2 -translate-y-1/2"><Sparkles size={12} className="text-purple-500 opacity-70" /></div>}
                            </div>
                         </div>
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Fax</label>
                            <div className="relative">
                                <NeuroInput 
                                    value={companyFax}
                                    onChange={(e) => { setCompanyFax(e.target.value); handleFieldChange('companyFax'); }}
                                    placeholder={PLACEHOLDERS.companyFax}
                                    className={`text-sm pl-8 pr-2 py-2 ${getAutoFillClass('companyFax')}`}
                                />
                                <Printer size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                {autoFilledFields.has('companyFax') && <div className="absolute right-1 top-1/2 -translate-y-1/2"><Sparkles size={12} className="text-purple-500 opacity-70" /></div>}
                            </div>
                         </div>
                         <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Email</label>
                            <div className="relative">
                                <NeuroInput 
                                    value={companyEmail}
                                    onChange={(e) => { setCompanyEmail(e.target.value); handleFieldChange('companyEmail'); }}
                                    placeholder={PLACEHOLDERS.companyEmail}
                                    className={`text-sm pl-8 pr-2 py-2 ${getAutoFillClass('companyEmail')}`}
                                />
                                <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                {autoFilledFields.has('companyEmail') && <div className="absolute right-1 top-1/2 -translate-y-1/2"><Sparkles size={12} className="text-purple-500 opacity-70" /></div>}
                            </div>
                         </div>
                    </div>
                </div>
            </NeuroCard>
        </div>

        {/* Section 2: Voucher Details (Right Column on Desktop) */}
        <div className="xl:col-span-8">
            <NeuroCard title="Voucher Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {/* Basic Info */}
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Voucher No.</label>
                        <div className="relative">
                            <NeuroInput 
                                value={voucherNo} 
                                onChange={(e) => setVoucherNo(e.target.value)} 
                                placeholder={PLACEHOLDERS.voucherNo}
                                className={`pl-10`}
                            />
                            <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Voucher Date</label>
                        <div className="relative">
                            <NeuroInput 
                                type="date" 
                                value={voucherDate} 
                                onChange={(e) => { setVoucherDate(e.target.value); handleFieldChange('voucherDate'); }}
                                className={`pl-10 pr-10 ${getAutoFillClass('voucherDate')}`}
                            />
                            <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            {autoFilledFields.has('voucherDate') && <AutoFilledIndicator />}
                        </div>
                    </div>

                    {/* Category & Payee */}
                    <div>
                        <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                            <Tag size={14} /> Category
                        </label>
                        <div className="relative">
                            <NeuroSelect 
                                value={category} 
                                onChange={(e) => setCategory(e.target.value)}
                                className={`pr-10 ${getAutoFillClass('category')}`}
                            >
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </NeuroSelect>
                             {autoFilledFields.has('category') && <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10"><AutoFilledIndicator /></div>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                            <User size={14} /> Payee Name
                        </label>
                        <div className="relative">
                            <NeuroInput 
                                value={payee} 
                                onChange={(e) => { setPayee(e.target.value); handleFieldChange('payee'); }}
                                placeholder={PLACEHOLDERS.payee}
                                className={`pr-10 ${getAutoFillClass('payee')}`}
                            />
                            {autoFilledFields.has('payee') && <AutoFilledIndicator />}
                        </div>
                    </div>

                    {/* ID & Authorization */}
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Payee IC / Company No (Required)</label>
                        <div className="relative">
                            <NeuroInput 
                                value={payeeIc}
                                onChange={(e) => { setPayeeIc(e.target.value); handleFieldChange('payeeIc'); }}
                                placeholder={PLACEHOLDERS.payeeIc}
                                className={`pr-10 ${getAutoFillClass('payeeIc')}`}
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
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
                            <label className="block text-sm text-gray-500">Description</label>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <NeuroButton 
                                    onClick={toggleDictation} 
                                    active={isDictating}
                                    className={`!py-1.5 !px-3 text-xs flex-1 sm:flex-none flex items-center justify-center gap-2 ${isDictating ? 'text-red-500' : 'text-blue-500'}`}
                                >
                                    {isDictating ? <MicOff size={14} /> : <Mic size={14} />}
                                    {isDictating ? 'Stop' : 'Dictate'}
                                </NeuroButton>
                                <NeuroButton 
                                    onClick={handleAISummary} 
                                    disabled={loadingAI} 
                                    className="!py-1.5 !px-3 text-xs flex-1 sm:flex-none flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={14} className={loadingAI ? "animate-spin" : "text-yellow-500"} />
                                    {loadingAI ? 'Generating...' : 'AI Summarize'}
                                </NeuroButton>
                            </div>
                        </div>
                        <div className="relative">
                            <NeuroTextarea 
                                value={description} 
                                onChange={(e) => setDescription(e.target.value)} 
                                placeholder={PLACEHOLDERS.description} 
                                rows={2}
                                className={`resize-none ${getAutoFillClass('description')}`}
                            />
                            {autoFilledFields.has('description') && <div className="absolute right-3 top-3"><AutoFilledIndicator /></div>}
                        </div>
                    </div>
                </div>
            </NeuroCard>

            {/* LHDN Tax Compliance Section */}
            <NeuroCard title="LHDN Tax Compliance" className="mt-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-white border border-gray-200/60 rounded-xl shadow-sm">
                        <label className="text-sm text-gray-700 font-medium flex items-center gap-2">
                             <FileCheck size={18} className="text-green-600" />
                             Tax Deductible
                             <button 
                                onClick={(e) => { e.preventDefault(); setShowLHDNHelp(true); }}
                                className="text-gray-400 hover:text-blue-500 transition-colors ml-1"
                                title="LHDN Deductibility Rules"
                             >
                                <HelpCircle size={15} />
                             </button>
                        </label>
                        <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
                           <input 
                               type="checkbox" 
                               className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                               checked={isTaxDeductible}
                               onChange={(e) => { setIsTaxDeductible(e.target.checked); handleFieldChange('isTaxDeductible'); }}
                           />
                           <div className={`w-12 h-6 rounded-full shadow-inner transition-colors duration-200 ${isTaxDeductible ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                           <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isTaxDeductible ? 'translate-x-6' : 'translate-x-0'}`}></div>
                           {autoFilledFields.has('isTaxDeductible') && <div className="absolute -right-2 -top-2"><Sparkles size={12} className="text-purple-500 animate-pulse" /></div>}
                       </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Tax Category</label>
                        <div className="relative">
                            <NeuroInput 
                                value={taxCategory}
                                onChange={(e) => { setTaxCategory(e.target.value); handleFieldChange('taxCategory'); }}
                                placeholder={PLACEHOLDERS.taxCategory}
                                className={`${getAutoFillClass('taxCategory')}`}
                            />
                             {autoFilledFields.has('taxCategory') && <AutoFilledIndicator />}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Tax Code / Limit</label>
                        <div className="relative">
                            <NeuroInput 
                                value={taxCode}
                                onChange={(e) => { setTaxCode(e.target.value); handleFieldChange('taxCode'); }}
                                placeholder={PLACEHOLDERS.taxCode}
                                className={`${getAutoFillClass('taxCode')}`}
                            />
                            {autoFilledFields.has('taxCode') && <AutoFilledIndicator />}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Tax Reason</label>
                        <div className="relative">
                            <NeuroInput 
                                value={taxReason}
                                onChange={(e) => { setTaxReason(e.target.value); handleFieldChange('taxReason'); }}
                                placeholder={PLACEHOLDERS.taxReason}
                                className={`${getAutoFillClass('taxReason')}`}
                            />
                             {autoFilledFields.has('taxReason') && <AutoFilledIndicator />}
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
                     {/* Responsive Item Row */}
                    {items.map((item, index) => (
                        <div key={item.id} className="group p-4 rounded-xl bg-white/30 border border-white/40 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-4 items-start md:items-center">
                            
                             {/* Mobile Header: Index + Delete (Visible only on mobile to save space on bottom row) */}
                             <div className="flex md:hidden justify-between w-full items-center border-b border-gray-200/50 pb-2 mb-1">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Item #{index + 1}</span>
                                <button onClick={() => deleteItem(item.id)} className="text-red-400 p-1 bg-red-50 rounded-lg">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Desktop Index */}
                            <div className="hidden md:block text-gray-400 font-mono font-bold text-sm w-8 pt-2 md:pt-0">
                                {index + 1}.
                            </div>
                            
                            {/* Description - Takes full width on mobile, flex-1 on desktop */}
                            <div className="w-full md:flex-1 min-w-0">
                                <label className="md:hidden text-xs text-gray-500 mb-1 block">Description</label>
                                <NeuroInput 
                                    placeholder="Item Description" 
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                />
                            </div>
                            
                            {/* Amount + Delete - Flex row on mobile/desktop */}
                            <div className="w-full md:w-40 relative">
                                <label className="md:hidden text-xs text-gray-500 mb-1 block">Amount</label>
                                <NeuroInput 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={item.amount}
                                    onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                                    className={`text-right pr-8 ${getAutoFillClass(`item-${item.id}-amount`)}`}
                                />
                                {autoFilledFields.has(`item-${item.id}-amount`) && (
                                    <div className="absolute right-3 top-8 md:top-1/2 md:-translate-y-1/2">
                                        <AutoFilledIndicator className="static translate-y-0" />
                                    </div>
                                )}
                            </div>

                             {/* Desktop Delete */}
                            <button 
                                onClick={() => deleteItem(item.id)}
                                className="hidden md:flex text-gray-400 hover:text-red-600 transition-colors p-3 rounded-xl hover:bg-red-50 self-center"
                                title="Remove Item"
                            >
                                <Trash2 size={20} />
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
                    <div className="text-3xl sm:text-5xl font-bold text-gray-700 tracking-tighter break-all text-center leading-none">
                        <span className="text-xl sm:text-2xl align-top mr-1 text-gray-400 font-normal">RM</span>
                        {total.toFixed(2)}
                    </div>
                    <NeuroBadge color="text-blue-600 bg-blue-100/50 px-4 py-1">Draft</NeuroBadge>
                </div>
                
                <div className="pt-6 border-t border-gray-200/50 space-y-3">
                    <NeuroButton 
                        onClick={handleAISummary} 
                        disabled={loadingAI} 
                        className="w-full text-purple-600 text-sm py-3 flex items-center justify-center gap-2"
                    >
                        <Sparkles size={16} className={loadingAI ? "animate-spin" : ""} />
                        {loadingAI ? 'Generating...' : 'AI Check Description'}
                    </NeuroButton>

                    <div className="grid grid-cols-2 gap-3">
                         <NeuroButton 
                            onClick={handlePreviewPDF}
                            className="w-full text-gray-600 text-sm py-3 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300"
                        >
                            <Eye size={16} />
                            Preview
                        </NeuroButton>
                        <NeuroButton 
                            onClick={handleDownloadPDF}
                            className="w-full text-red-600 text-sm py-3 flex items-center justify-center gap-2"
                            title="Download PDF"
                        >
                            <FileText size={16} /> PDF
                        </NeuroButton>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <NeuroButton onClick={handleExportExcel} className="w-full text-green-600 text-sm py-3 flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200" title="Export to Excel">
                            <FileSpreadsheet size={16} /> Excel
                        </NeuroButton>
                         <NeuroButton onClick={handleExportWord} className="w-full text-blue-600 text-sm py-3 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200" title="Export to Word">
                            <FileText size={16} /> Word
                        </NeuroButton>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
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
                            className={`pl-10 pr-10 ${getAutoFillClass('originalDate')}`}
                        />
                        {autoFilledFields.has('originalDate') && <AutoFilledIndicator />}
                    </div>
               </div>
               <div>
                    <label className="block text-sm text-gray-500 mb-2">Evidence Type</label>
                    <NeuroInput 
                        placeholder={PLACEHOLDERS.evidenceType}
                        value={evidenceType}
                        onChange={(e) => setEvidenceType(e.target.value)}
                    />
               </div>
               <div>
                    <label className="block text-sm text-gray-500 mb-2">Evidence Reference</label>
                    <NeuroInput 
                        placeholder={PLACEHOLDERS.evidenceRef}
                        value={evidenceRef}
                        onChange={(e) => setEvidenceRef(e.target.value)}
                    />
               </div>
               <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm text-gray-500 mb-2">Reason for Lost Receipt</label>
                    <NeuroTextarea 
                        placeholder={PLACEHOLDERS.lostReason}
                        value={lostReason}
                        onChange={(e) => setLostReason(e.target.value)}
                        rows={2}
                        className={`resize-none`}
                    />
               </div>
          </div>
      </NeuroCard>
      
      {/* PDF Preview Modal */}
      {showPdfPreview && previewPdfUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="absolute inset-0" onClick={() => setShowPdfPreview(false)}></div>
             <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col relative z-10 shadow-2xl">
                 <div className="flex justify-between items-center p-4 border-b">
                     <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                         <Printer size={18} /> Print Preview
                     </h3>
                     <button onClick={() => setShowPdfPreview(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                         <X size={24} />
                     </button>
                 </div>
                 <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
                     <iframe src={previewPdfUrl} className="w-full h-full rounded-lg border border-gray-300 shadow-inner" title="PDF Preview"></iframe>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setErrorModal({ ...errorModal, show: false })}></div>
            <NeuroCard className="w-full max-w-sm relative z-10 shadow-2xl border-2 border-red-100 text-center bg-white">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">{errorModal.title || "Scan Failed"}</h3>
                    <p className="text-sm text-gray-500 mb-6 px-2 leading-relaxed">
                    {errorModal.message}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <NeuroButton onClick={() => setErrorModal({ ...errorModal, show: false })} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6">Dismiss</NeuroButton>
                    </div>
            </NeuroCard>
            </div>
      )}

      {/* LHDN Helper Modal */}
      {showLHDNHelp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setShowLHDNHelp(false)}></div>
            <NeuroCard className="w-full max-w-md relative z-20 shadow-2xl border border-blue-100 max-h-[85vh] overflow-y-auto bg-white">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-blue-600"/> LHDN Tax Guide
                    </h3>
                    <button onClick={() => setShowLHDNHelp(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-4 text-sm text-gray-600">
                    <p className="bg-blue-50 p-3 rounded-lg text-blue-800 text-xs leading-relaxed">
                        <strong>Sec 33(1) Income Tax Act 1967:</strong> Expenses must be wholly and exclusively incurred in the production of gross income to be deductible.
                    </p>

                    <div className="space-y-3">
                        <div className="p-3 rounded-lg border border-orange-100 bg-orange-50/50">
                            <strong className="block text-orange-800 text-xs uppercase tracking-wider mb-1">Entertainment (50% Rule)</strong>
                            <p className="text-xs">Generally 50% restricted. <br/>
                            <span className="italic opacity-80">Exception (100%):</span> Staff annual dinner, promotional gifts to public, entertainment related to sales of cultural events.</p>
                        </div>
                        <div className="p-3 rounded-lg border border-green-100 bg-green-50/50">
                            <strong className="block text-green-800 text-xs uppercase tracking-wider mb-1">Staff Welfare</strong>
                            <p className="text-xs">100% deductible (e.g., pantry items, medical fees). Requires proper documentation.</p>
                        </div>
                        <div className="p-3 rounded-lg border border-purple-100 bg-purple-50/50">
                            <strong className="block text-purple-800 text-xs uppercase tracking-wider mb-1">Travel & Transport</strong>
                            <p className="text-xs">Official business travel is deductible. Petrol/Toll requires receipts. Travel between home and office is <span className="text-red-500 font-bold">NOT</span> deductible.</p>
                        </div>
                        <div className="p-3 rounded-lg border border-red-100 bg-red-50/50">
                            <strong className="block text-red-800 text-xs uppercase tracking-wider mb-1">Capital Expenditure (Non-Deductible)</strong>
                            <p className="text-xs">Assets (Computers, Furniture, Renovation) are capital in nature. Claim Capital Allowances instead.</p>
                        </div>
                    </div>
                    
                     <div className="pt-2 text-center border-t border-gray-100 mt-2">
                        <a href="https://www.hasil.gov.my/" target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center justify-center gap-1">
                            Visit LHDN Official Portal <ExternalLink size={10} />
                        </a>
                    </div>
                </div>
            </NeuroCard>
        </div>
      )}
      
      {/* Batch Review Modal */}
      {showBatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="absolute inset-0" onClick={() => !isBatchProcessing && setShowBatchModal(false)}></div>
             <NeuroCard className="w-full max-w-4xl h-[80vh] flex flex-col relative z-10 shadow-2xl p-0 overflow-hidden bg-white">
                 <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                     <div>
                         <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                            <Layers size={18} className="text-purple-600" /> Batch Processing Queue
                         </h3>
                         <p className="text-xs text-gray-500">Review receipts and load them into the voucher form.</p>
                     </div>
                     <div className="flex gap-2">
                        <NeuroButton 
                            onClick={() => batchInputRef.current?.click()} 
                            disabled={isBatchProcessing}
                            className="text-xs !py-2 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 shadow-sm"
                        >
                            <Plus size={14} className="inline mr-1"/> Add More
                        </NeuroButton>
                        <button onClick={() => !isBatchProcessing && setShowBatchModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={24} />
                        </button>
                     </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-4 bg-gray-100/50">
                     <div className="grid gap-3">
                         {batchQueue.map((item) => (
                             <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                                 {/* Thumbnail */}
                                 <div className="w-full md:w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative border border-gray-200">
                                     <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                     {item.status === 'processing' && (
                                         <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                             <Loader2 className="animate-spin text-white" size={20} />
                                         </div>
                                     )}
                                     {item.status === 'completed' && (
                                         <div className="absolute bottom-0 right-0 bg-green-500 p-1 rounded-tl-lg">
                                             <CheckCircle2 size={12} className="text-white" />
                                         </div>
                                     )}
                                 </div>
                                 
                                 {/* Info */}
                                 <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                     <div className="col-span-2 md:col-span-1">
                                         <span className="text-xs text-gray-400 block uppercase font-bold">File</span>
                                         <span className="text-sm font-medium text-gray-700 truncate block" title={item.file.name}>{item.file.name}</span>
                                     </div>
                                     
                                     {item.status === 'completed' && item.data ? (
                                        <>
                                            <div>
                                                <span className="text-xs text-gray-400 block uppercase font-bold">Payee</span>
                                                <span className="text-sm text-gray-700 truncate block">{item.data.payeeName || "-"}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-400 block uppercase font-bold">Amount</span>
                                                <span className="text-sm font-bold text-gray-700 block">
                                                    {item.data.totalAmount ? `RM ${item.data.totalAmount.toFixed(2)}` : "-"}
                                                </span>
                                            </div>
                                        </>
                                     ) : (
                                         <div className="col-span-2 flex items-center text-gray-400 text-sm italic">
                                            {item.status === 'processing' ? 'Extracting data...' : item.status === 'failed' ? item.error : 'Waiting...'}
                                         </div>
                                     )}
                                     
                                     <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-2">
                                         {item.status === 'completed' && (
                                             <NeuroButton 
                                                onClick={() => loadFromBatch(item)} 
                                                className="!py-1.5 !px-3 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 shadow-none border border-purple-200 flex items-center gap-1"
                                             >
                                                 Load <ArrowRight size={14} />
                                             </NeuroButton>
                                         )}
                                          {item.status === 'failed' && (
                                             <span className="text-xs text-red-500 font-bold px-2 py-1 bg-red-50 rounded">Failed</span>
                                         )}
                                     </div>
                                 </div>
                             </div>
                         ))}
                         
                         {batchQueue.length === 0 && (
                             <div className="text-center py-12 text-gray-400">
                                 <Layers size={48} className="mx-auto mb-3 opacity-20" />
                                 <p>No receipts in queue.</p>
                             </div>
                         )}
                     </div>
                 </div>
                 
                 <div className="p-4 border-t bg-white flex justify-between items-center text-xs text-gray-500">
                    <span>Processed items can be loaded one by one.</span>
                    <NeuroButton onClick={() => setShowBatchModal(false)} className="text-xs !py-2 bg-gray-100 hover:bg-gray-200 shadow-none">
                        Close
                    </NeuroButton>
                 </div>
             </NeuroCard>
          </div>
      )}

      {/* OCR Confirmation Dialog */}
      {showOCRConfirm && extractedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setShowOCRConfirm(false)}></div>
            <NeuroCard className="w-full max-w-lg relative z-10 shadow-2xl border-2 border-purple-100 max-h-[90vh] overflow-y-auto bg-[#e0e5ec]">
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#e0e5ec]/95 backdrop-blur z-20 pb-4 border-b border-gray-200/50 pt-2">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                            <ScanLine size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 tracking-tight">Verify Extraction</h3>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                <span className="flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-md border border-gray-200/50">
                                    <Pencil size={10} /> Editable
                                </span>
                                <button 
                                    onClick={() => setShowOCRHelp(true)}
                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                                >
                                    <HelpCircle size={12} /> Learn More
                                </button>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => { setShowOCRConfirm(false); setExtractedData(null); }} 
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="space-y-6 mb-8 px-1">
                    
                    {/* Primary Transaction Info */}
                    <div className="space-y-4 p-2">
                        <div className="grid grid-cols-2 gap-4">
                             <div className="col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Payee Name</label>
                                <NeuroInput 
                                    value={extractedData.payeeName || ''} 
                                    onChange={(e) => handleExtractedDataChange('payeeName', e.target.value)}
                                    placeholder="Merchant Name"
                                    className={`!py-2 text-sm font-semibold`}
                                />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Date</label>
                                <NeuroInput 
                                    type="date"
                                    value={extractedData.date || ''} 
                                    onChange={(e) => handleExtractedDataChange('date', e.target.value)}
                                    className={`!py-2 text-sm`}
                                />
                             </div>
                             <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Total Amount</label>
                                <div className="relative">
                                    <NeuroInput 
                                        type="number"
                                        value={extractedData.totalAmount || ''} 
                                        onChange={(e) => handleExtractedDataChange('totalAmount', parseFloat(e.target.value))}
                                        className={`!py-2 text-sm pr-2 text-right font-bold text-purple-600`}
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">RM</span>
                                    {(!extractedData.totalAmount || extractedData.totalAmount === 0) && (
                                        <div className="absolute right-2 top-[-20px] text-[10px] text-red-500 font-bold flex items-center bg-red-50 px-1 rounded shadow-sm border border-red-100">
                                            <AlertTriangle size={10} className="mr-1"/> Check Amount
                                        </div>
                                    )}
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Company Info (Bill To) */}
                    <div className="space-y-3 relative group p-2">
                        <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-100 transition-opacity">
                            <Building2 size={16} className="text-gray-400" />
                        </div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-300/30 pb-1">Bill To Details</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Company Name</label>
                                <NeuroInput 
                                    value={extractedData.companyName || ''}
                                    onChange={(e) => handleExtractedDataChange('companyName', e.target.value)}
                                    placeholder="N/A"
                                    className={`!py-1.5 text-xs`}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Reg No</label>
                                <NeuroInput 
                                    value={extractedData.companyRegNo || ''}
                                    onChange={(e) => handleExtractedDataChange('companyRegNo', e.target.value)}
                                    placeholder="N/A"
                                    className={`!py-1.5 text-xs`}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Address</label>
                                <NeuroInput 
                                    value={extractedData.companyAddress || ''}
                                    onChange={(e) => handleExtractedDataChange('companyAddress', e.target.value)}
                                    placeholder="N/A"
                                    className={`!py-1.5 text-xs`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tax Analysis */}
                    <div className="space-y-3 p-2 border-t border-gray-300/20 pt-4">
                         <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                                <ShieldCheck size={12} /> Tax Analysis
                            </h4>
                            
                             <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <span className={extractedData.taxDeductible ? "text-green-600 font-bold" : "text-gray-500"}>Deductible</span>
                                <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out rounded-full cursor-pointer">
                                   <input 
                                       type="checkbox" 
                                       className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                                       checked={!!extractedData.taxDeductible}
                                       onChange={(e) => handleExtractedDataChange('taxDeductible', e.target.checked)}
                                   />
                                   <div className={`w-10 h-5 rounded-full shadow-inner transition-colors duration-200 ${extractedData.taxDeductible ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                                   <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${extractedData.taxDeductible ? 'translate-x-5' : 'translate-x-0'}`}></div>
                               </div>
                             </label>
                         </div>

                         <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Category</label>
                                <NeuroInput 
                                    value={extractedData.taxCategory || ''}
                                    onChange={(e) => handleExtractedDataChange('taxCategory', e.target.value)}
                                    className={`!py-1.5 text-xs`}
                                />
                            </div>
                             <div>
                                <label className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Tax Code/Limit</label>
                                <NeuroInput 
                                    value={extractedData.taxCode || extractedData.taxLimit || ''}
                                    onChange={(e) => handleExtractedDataChange('taxCode', e.target.value)}
                                    className={`!py-1.5 text-xs`}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Reasoning</label>
                                <div className="text-xs text-blue-800 italic bg-white/50 p-2 rounded border border-blue-100">
                                    {extractedData.taxReason || "No specific tax reasoning provided."}
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
                
                <div className="flex gap-4 justify-end pt-4 border-t border-gray-200 bg-[#e0e5ec] p-4 -mx-0 sticky bottom-0">
                    <NeuroButton 
                        onClick={() => {
                            setShowOCRConfirm(false);
                            setExtractedData(null);
                        }} 
                        className="text-sm px-6 bg-[#e0e5ec] hover:translate-y-[-1px] text-gray-600"
                    >
                        Cancel
                    </NeuroButton>
                    <NeuroButton 
                        onClick={() => applyOCRData()} 
                        className="text-sm text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 font-bold px-6 flex items-center gap-2"
                    >
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
                                 <div><strong className="text-gray-800 block">Payee Name</strong> The merchant/shop name detected on top of the receipt.</div>
                             </li>
                             <li className="flex gap-2">
                                 <div className="min-w-[4px] bg-purple-400 rounded-full h-auto"></div>
                                 <div><strong className="text-gray-800 block">Total Amount</strong> Final charge found (Total/Grand Total/Net).</div>
                             </li>
                             <li className="flex gap-2">
                                 <div className="min-w-[4px] bg-green-400 rounded-full h-auto"></div>
                                 <div><strong className="text-gray-800 block">Dates</strong> Transaction dates are standardized to YYYY-MM-DD.</div>
                             </li>
                             <li className="flex gap-2">
                                 <div className="min-w-[4px] bg-orange-400 rounded-full h-auto"></div>
                                 <div><strong className="text-gray-800 block">Bill To</strong> If the receipt is an invoice, we try to capture the recipient company details.</div>
                             </li>
                         </ul>
                     </NeuroCard>
                 </div>
             )}
        </div>
      )}

      {/* Save Confirmation Dialog */}
      {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setShowConfirmDialog(false)}></div>
            <NeuroCard className="w-full max-w-md relative z-10 shadow-2xl border-2 border-blue-100 text-center bg-white">
                 <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-600">
                     <AlertTriangle size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-gray-700 mb-2">Confirm Voucher Details</h3>
                 
                 <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-100">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                        <div className="text-gray-500 font-medium">Payee:</div>
                        <div className="font-bold text-gray-800 text-right truncate">{payee || "-"}</div>
                        
                        <div className="text-gray-500 font-medium">Date:</div>
                        <div className="font-bold text-gray-800 text-right">{voucherDate || "-"}</div>
                        
                        <div className="text-gray-500 font-medium">Total Amount:</div>
                        <div className="font-bold text-blue-600 text-right">RM {total.toFixed(2)}</div>
                        
                        <div className="text-gray-500 font-medium">Items:</div>
                        <div className="font-bold text-gray-800 text-right">{items.length}</div>
                    </div>
                 </div>

                 <p className="text-xs text-gray-500 mb-6">
                    You are about to save this voucher as <strong>Final/Completed</strong>. <br/>
                    Please verify the summary above is correct before proceeding.
                 </p>
                 <div className="flex gap-3 justify-center">
                     <NeuroButton onClick={() => setShowConfirmDialog(false)} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 shadow-none border border-gray-200">Back to Edit</NeuroButton>
                     <NeuroButton onClick={() => executeSaveVoucher('COMPLETED')} className="text-sm text-white bg-blue-600 shadow-lg shadow-blue-300/50 hover:bg-blue-700">Confirm & Save</NeuroButton>
                 </div>
            </NeuroCard>
          </div>
      )}
    </div>
  );
};