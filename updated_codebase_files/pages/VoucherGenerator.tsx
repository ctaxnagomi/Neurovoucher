import React, { useState, useRef, useEffect } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroBadge, NeuroTextarea, NeuroSelect } from '../components/NeuroComponents';
import { generateFastSummary, generateSpeech, extractReceiptData, getLiveClient } from '../services/geminiService';
import { createPcmBlob } from '../services/audioUtils';
import { Sparkles, Play, Plus, Trash2, Save, Upload, X, Calendar, FileText, AlertTriangle, Building2, User, ScanLine, CheckCircle2, Mic, MicOff, Tag, Info, Image as ImageIcon, Languages, Download, Eye, Mail, Phone, Printer } from 'lucide-react';
import { VoucherItem, SUPPORTED_LANGUAGES } from '../types';
import { Modality, LiveServerMessage } from '@google/genai';
import { jsPDF } from "jspdf";

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
    lostReason: "Brief explanation for why the original receipt is missing..."
};

const AutoFilledIndicator = () => (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 pointer-events-none animate-pulse z-10" title="Auto-filled by AI">
        <Sparkles size={16} fill="currentColor" className="opacity-70" />
    </div>
);

// Unified style for consistent "white" look across all inputs (replacing dark neumorphic shadow)
// Added min-w-0 to prevent flex overflow
const commonInputStyle = "w-full !bg-white !shadow-none border border-gray-200/60 focus:!border-blue-400 focus:!ring-4 focus:!ring-blue-50 transition-all duration-300 placeholder:text-gray-400 text-gray-700 min-w-0";

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
  
  // PDF Preview State
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  // Auto-filled field tracking
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  // Dictation State
  const [isDictating, setIsDictating] = useState(false);
  const dictationCleanupRef = useRef<() => void>(() => {});

  const fileInputRef = useRef<HTMLInputElement>(null); // For Receipt OCR
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
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
        try {
            const base64String = (reader.result as string).split(',')[1];
            // Pass the selected language code for context
            const data = await extractReceiptData(base64String, ocrLanguage);
            
            if (!data || Object.keys(data).length === 0) {
                alert('Could not extract data from the image. Please try a clearer photo.');
                setScanning(false);
                return;
            }

            // Store extracted data for confirmation
            setExtractedData(data);
            setShowOCRConfirm(true);
            
        } catch (error) {
            console.error(error);
            alert('Error processing image.');
        } finally {
            setScanning(false);
        }
    };
    reader.readAsDataURL(file);
    // Reset inputs
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (companyDocInputRef.current) companyDocInputRef.current.value = '';
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

  const applyOCRData = () => {
    if (!extractedData) return;

    // Use existing auto-filled fields to preserve previous fills if merging
    const newAutoFilled = new Set<string>(autoFilledFields);

    // Refined isEmpty check: Checks for empty string OR matching placeholder value
    const isEmpty = (val: string, placeholder?: string) => {
        if (!val || val.trim() === '') return true;
        if (placeholder && val.trim() === placeholder) return true;
        return false;
    };

    const applyIfEmpty = (currentValue: string, newValue: any, fieldKey: string, setter: (val: any) => void, placeholder?: string) => {
        // Only apply if the current value is considered empty and we have a new value
        if (newValue && isEmpty(currentValue, placeholder)) {
            setter(newValue);
            newAutoFilled.add(fieldKey);
        }
    };

    // Pre-fill Payee
    applyIfEmpty(payee, extractedData.payeeName, 'payee', setPayee, PLACEHOLDERS.payee);
    applyIfEmpty(payeeIc, extractedData.payeeId, 'payeeIc', setPayeeIc, PLACEHOLDERS.payeeIc);
    
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
    
    // Pre-fill Company (if 'Bill To' detected or specific company doc scanned)
    applyIfEmpty(companyName, extractedData.companyName, 'companyName', setCompanyName, PLACEHOLDERS.companyName);
    applyIfEmpty(companyRegNo, extractedData.companyRegNo, 'companyRegNo', setCompanyRegNo, PLACEHOLDERS.companyRegNo);
    applyIfEmpty(companyAddress, extractedData.companyAddress, 'companyAddress', setCompanyAddress, PLACEHOLDERS.companyAddress);
    
    // Apply Contact Info
    applyIfEmpty(companyTel, extractedData.companyTel, 'companyTel', setCompanyTel, PLACEHOLDERS.companyTel);
    applyIfEmpty(companyEmail, extractedData.companyEmail, 'companyEmail', setCompanyEmail, PLACEHOLDERS.companyEmail);
    applyIfEmpty(companyFax, extractedData.companyFax, 'companyFax', setCompanyFax, PLACEHOLDERS.companyFax);

    // Intelligent Item & Amount Handling
    if (extractedData.totalAmount) {
        // Case 1: No items exist - create new item
        if (items.length === 0) {
            const newItemId = Date.now().toString();
            setItems([{
                id: newItemId,
                description: 'Receipt Import',
                amount: extractedData.totalAmount
            }]);
            newAutoFilled.add(`item-${newItemId}-amount`);
        } 
        // Case 2: Single item exists - update if empty/default
        else if (items.length === 1) {
            const item = items[0];
            const isAmountZero = Number(item.amount) === 0;
            const isDescEmpty = isEmpty(item.description, PLACEHOLDERS.description);

            // If amount is 0 (default/empty), we can fill it.
            // If user has entered an amount (!= 0), we do NOT overwrite it.
            if (isAmountZero) {
                 const updatedItem = { ...item, amount: extractedData.totalAmount };
                 newAutoFilled.add(`item-${item.id}-amount`);
                 
                 // Only add default description if completely empty
                 if (isDescEmpty) {
                     updatedItem.description = 'Receipt Import';
                 }
                 setItems([updatedItem]);
            }
        }
    }

    setAutoFilledFields(newAutoFilled);
    setShowOCRConfirm(false);
    setExtractedData(null);
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
                <NeuroButton onClick={() => fileInputRef.current?.click()} disabled={scanning} className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm whitespace-nowrap min-w-[140px]">
                    <Upload size={16} className={scanning ? "animate-bounce text-blue-500" : "text-purple-600"} />
                    {scanning ? 'Scanning...' : 'Upload Receipt'}
                </NeuroButton>
                <NeuroButton onClick={handleReadAloud} disabled={playingAudio} className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm whitespace-nowrap min-w-[130px]">
                    <Play size={16} className={playingAudio ? "text-green-500" : "text-blue-500"} />
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
                    <h3 className="text-lg font-bold text-gray-600 uppercase tracking-wider">Company Information (Letterhead)</h3>
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
                            Position: Top Left (q1)
                         </p>
                    </div>

                    <div className="relative">
                        <label className="block text-sm text-gray-500 mb-2 flex items-center gap-2">
                            <Building2 size={14} /> Company Name (q2)
                        </label>
                        <div className="relative">
                            <NeuroInput 
                                value={companyName} 
                                onChange={(e) => { setCompanyName(e.target.value); handleFieldChange('companyName'); }}
                                placeholder={PLACEHOLDERS.companyName}
                                className={`${commonInputStyle} pr-10 ${getAutoFillClass('companyName')}`}
                            />
                            {autoFilledFields.has('companyName') && <AutoFilledIndicator />}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Registration No (q3)</label>
                        <div className="relative">
                            <NeuroInput 
                                value={companyRegNo} 
                                onChange={(e) => { setCompanyRegNo(e.target.value); handleFieldChange('companyRegNo'); }}
                                placeholder={PLACEHOLDERS.companyRegNo}
                                className={`${commonInputStyle} pl-10 pr-10 ${getAutoFillClass('companyRegNo')}`}
                            />
                            <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            {autoFilledFields.has('companyRegNo') && <AutoFilledIndicator />}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Address (q4)</label>
                        <div className="relative">
                            <NeuroTextarea 
                                rows={3}
                                value={companyAddress} 
                                onChange={(e) => { setCompanyAddress(e.target.value); handleFieldChange('companyAddress'); }}
                                placeholder={PLACEHOLDERS.companyAddress} 
                                className={`${commonInputStyle} resize-none ${getAutoFillClass('companyAddress')}`}
                            />
                            {autoFilledFields.has('companyAddress') && <div className="absolute right-3 top-3"><Sparkles size={16} className="text-purple-500 animate-pulse opacity-70" /></div>}
                        </div>
                    </div>
                    
                    {/* Contact Details (q5) */}
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Tel (q5)</label>
                            <div className="relative">
                                <NeuroInput 
                                    value={companyTel}
                                    onChange={(e) => { setCompanyTel(e.target.value); handleFieldChange('companyTel'); }}
                                    placeholder={PLACEHOLDERS.companyTel}
                                    className={`${commonInputStyle} text-sm px-2 py-2 ${getAutoFillClass('companyTel')}`}
                                />
                                {autoFilledFields.has('companyTel') && <div className="absolute right-1 top-1/2 -translate-y-1/2"><Sparkles size={12} className="text-purple-500 opacity-70" /></div>}
                            </div>
                         </div>
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Fax (q5)</label>
                            <div className="relative">
                                <NeuroInput 
                                    value={companyFax}
                                    onChange={(e) => { setCompanyFax(e.target.value); handleFieldChange('companyFax'); }}
                                    placeholder={PLACEHOLDERS.companyFax}
                                    className={`${commonInputStyle} text-sm px-2 py-2 ${getAutoFillClass('companyFax')}`}
                                />
                                {autoFilledFields.has('companyFax') && <div className="absolute right-1 top-1/2 -translate-y-1/2"><Sparkles size={12} className="text-purple-500 opacity-70" /></div>}
                            </div>
                         </div>
                         <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Email (q5)</label>
                            <div className="relative">
                                <NeuroInput 
                                    value={companyEmail}
                                    onChange={(e) => { setCompanyEmail(e.target.value); handleFieldChange('companyEmail'); }}
                                    placeholder={PLACEHOLDERS.companyEmail}
                                    className={`${commonInputStyle} text-sm px-2 py-2 ${getAutoFillClass('companyEmail')}`}
                                />
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
                                className={`${commonInputStyle} pl-10`}
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
                                className={`${commonInputStyle} pl-10 pr-10 ${getAutoFillClass('voucherDate')}`}
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
                        <NeuroSelect 
                            value={category} 
                            onChange={(e) => setCategory(e.target.value)}
                            className={`${commonInputStyle} pr-10`}
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
                                placeholder={PLACEHOLDERS.payee}
                                className={`${commonInputStyle} pr-10 ${getAutoFillClass('payee')}`}
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
                                className={`${commonInputStyle} pr-10 ${getAutoFillClass('payeeIc')}`}
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
                            className={commonInputStyle}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-500 mb-2">Approved By</label>
                        <NeuroInput 
                            value={approvedBy} 
                            onChange={(e) => setApprovedBy(e.target.value)} 
                            placeholder="Name" 
                            className={commonInputStyle}
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
                        <NeuroTextarea 
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                            placeholder={PLACEHOLDERS.description} 
                            rows={2}
                            className={`${commonInputStyle} resize-none`}
                        />
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
                                    className={commonInputStyle}
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
                                    className={`text-right ${commonInputStyle} pr-8 ${getAutoFillClass(`item-${item.id}-amount`)}`}
                                />
                                {autoFilledFields.has(`item-${item.id}-amount`) && (
                                    <div className="absolute right-3 top-8 md:top-1/2 md:-translate-y-1/2 pointer-events-none">
                                        <Sparkles size={12} className="text-purple-500 animate-pulse" />
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
                            className="w-full text-green-600 text-sm py-3 flex items-center justify-center gap-2"
                        >
                            <Download size={16} />
                            Download
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
                            className={`${commonInputStyle} pr-10 ${getAutoFillClass('originalDate')}`}
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
                        className={commonInputStyle}
                    />
               </div>
               <div>
                    <label className="block text-sm text-gray-500 mb-2">Evidence Reference</label>
                    <NeuroInput 
                        placeholder={PLACEHOLDERS.evidenceRef}
                        value={evidenceRef}
                        onChange={(e) => setEvidenceRef(e.target.value)}
                        className={commonInputStyle}
                    />
               </div>
               <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm text-gray-500 mb-2">Reason for Lost Receipt</label>
                    <NeuroTextarea 
                        placeholder={PLACEHOLDERS.lostReason}
                        value={lostReason}
                        onChange={(e) => setLostReason(e.target.value)}
                        rows={2}
                        className={`${commonInputStyle} resize-none`}
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
                        
                        {/* Company Details */}
                        {(extractedData.companyName || extractedData.companyRegNo) && (
                            <div className="flex flex-col border-b border-gray-300/50 pb-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Bill To</span> 
                                    <span className="font-semibold text-gray-700 text-right truncate max-w-[200px]">{extractedData.companyName || '-'}</span>
                                </div>
                                {extractedData.companyRegNo && (
                                    <span className="text-xs text-gray-400 text-right mt-1 block">Reg: {extractedData.companyRegNo}</span>
                                )}
                            </div>
                        )}
                        
                        {extractedData.companyAddress && (
                            <div className="flex flex-col border-b border-gray-300/50 pb-2">
                                <span className="text-gray-500 mb-1">Company Address</span> 
                                <span className="text-xs text-gray-600 text-right leading-relaxed bg-white/50 p-2 rounded-lg border border-gray-200/50">{extractedData.companyAddress}</span>
                            </div>
                        )}

                        {(extractedData.companyTel || extractedData.companyEmail) && (
                            <div className="flex flex-col pt-1">
                                <span className="text-gray-500 mb-1">Contact</span>
                                <span className="text-xs text-gray-600 text-right">
                                    {extractedData.companyTel} {extractedData.companyEmail ? `| ${extractedData.companyEmail}` : ''}
                                </span>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-center text-gray-400">OCR data will only fill empty fields. Your existing entries are safe.</p>
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
            <NeuroCard className="w-full max-w-sm relative z-10 shadow-2xl border-2 border-blue-100 text-center">
                 <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-600">
                     <AlertTriangle size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-gray-700 mb-2">Confirm Save?</h3>
                 <p className="text-sm text-gray-500 mb-6">
                    You are about to save this voucher as <strong>Final/Completed</strong>. 
                    Ensure all details are correct as this may affect financial records.
                 </p>
                 <div className="flex gap-3 justify-center">
                     <NeuroButton onClick={() => setShowConfirmDialog(false)} className="text-sm">Edit</NeuroButton>
                     <NeuroButton onClick={() => executeSaveVoucher('COMPLETED')} className="text-sm text-white bg-blue-600 shadow-lg shadow-blue-300/50 hover:bg-blue-700">Confirm & Save</NeuroButton>
                 </div>
            </NeuroCard>
          </div>
      )}
    </div>
  );
};