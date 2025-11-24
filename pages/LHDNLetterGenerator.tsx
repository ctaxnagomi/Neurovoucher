import React, { useState, useRef } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroTextarea, NeuroBadge, NeuroSelect } from '../components/NeuroComponents';
import { generateFastSummary, extractLetterhead } from '../services/geminiService';
import { Download, Copy, Sparkles, Printer, FileCheck, ShieldCheck, HelpCircle, ScrollText, Info, ListChecks, AlertTriangle, XCircle, ScanLine, Loader2, FileText } from 'lucide-react';
import { jsPDF } from "jspdf";

export const CHECKLIST_ITEMS = [
    "Original signed Explanation Letter (on Company Letterhead)",
    "Replacement Cash Vouchers (PV) for every missing receipt",
    "Certified True Copy of Bank Statements highlighting the transactions",
    "Payment proofs (Cheque butts / Online transfer receipts)",
    "General Ledger extract showing the expense entry",
    "Director's Resolution (if amount is significant > RM 10k)"
];

export const LHDNLetterGenerator: React.FC = () => {
    // Company Details
    const [companyName, setCompanyName] = useState('Tech Solutions Malaysia Sdn. Bhd.');
    const [regNo, setRegNo] = useState('001234567-A');
    const [address, setAddress] = useState('Suite 5-8, Level 5, Plaza Teknologi\n50088 Kuala Lumpur');
    const [phone, setPhone] = useState('03-1234-5678');
    const [email, setEmail] = useState('finance@techsolutions.com.my');

    // Case Details
    const [yearAssessment, setYearAssessment] = useState('2021');
    const [reason, setReason] = useState('During the financial year, our company experienced an unforeseen data loss incident in our document management system due to a hardware failure.');
    const [totalAmount, setTotalAmount] = useState('187,450.00');

    // Evidence
    const [bankName, setBankName] = useState('Maybank Berhad');
    const [bankAccount, setBankAccount] = useState('123-456-789-012');
    const [voucherStart, setVoucherStart] = useState('CV-2021-001');
    const [voucherEnd, setVoucherEnd] = useState('CV-2021-047');

    // Signatory
    const [signatoryName, setSignatoryName] = useState('Ms. Sarah Lim Chen Wei');
    const [designation, setDesignation] = useState('Finance Director');

    // LHDN Office
    const [lhdnAddress, setLhdnAddress] = useState('Lembaga Hasil Dalam Negeri (LHDN)\nLHDN Headquarters\nMentakab\n28400 Pahang');

    const [isPolishing, setIsPolishing] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [paperSize, setPaperSize] = useState<'a4' | 'letter'>('a4');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleScanLetterhead = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanning(true);
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const data = await extractLetterhead(base64);
                
                if (data) {
                    if (data.companyName) setCompanyName(data.companyName);
                    if (data.regNo) setRegNo(data.regNo);
                    if (data.address) setAddress(data.address);
                    if (data.phone) setPhone(data.phone);
                    if (data.email) setEmail(data.email);
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            alert("Failed to scan letterhead.");
        } finally {
            setScanning(false);
        }
        
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePolishReason = async () => {
        if (!reason) return;
        setIsPolishing(true);
        try {
            const prompt = `Rewrite this reason for missing receipts in a formal, professional tone suitable for a letter to LHDN Malaysia. Keep it concise but explanatory. Reason: "${reason}"`;
            const refined = await generateFastSummary(prompt);
            setReason(refined.replace(/^"|"$/g, '')); // Remove quotes if added
        } catch (e) {
            console.error(e);
        } finally {
            setIsPolishing(false);
        }
    };

    const generateLetterContent = () => {
        const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        return `${companyName}
${address}
Phone: ${phone}
Email: ${email}

${today}

To:
${lhdnAddress}

RE: EXPLANATION FOR MISSING RECEIPTS
YEAR OF ASSESSMENT ${yearAssessment}
COMPANY: ${companyName.toUpperCase()}
REGISTRATION NUMBER: ${regNo}

Your Honour / Dear Director,

This letter is submitted in explanation of the missing receipts and supporting documents relating to expenses incurred during the Year of Assessment ${yearAssessment}. Our company acknowledges the importance of maintaining proper documentation for all business transactions and regrets the loss of certain receipt records.

CIRCUMSTANCES OF MISSING RECEIPTS:
${reason}

As a result, we were unable to retain complete original receipts for all business expenses incurred. However, we have maintained comprehensive bank statements and financial reconciliation records for the entire fiscal year.

SUPPORTING DOCUMENTATION:
In lieu of original receipts, we hereby submit the following supporting documentation:

1. Cash Vouchers (Attached)
We have prepared detailed cash vouchers for all missing expense transactions during ${yearAssessment}. Each voucher has been:
• Prepared with complete details of the transaction
• Cross-referenced with our bank statements
• Signed and approved by appropriate management personnel
• Numbered sequentially (${voucherStart} through ${voucherEnd})

2. Bank Statements (Attached)
Complete bank statements for the Year of Assessment ${yearAssessment} are enclosed, which clearly show:
• All funds disbursed for business operations
• Dates, amounts, and reference information for each transaction
• Clear traceability between bank records and expense vouchers
• Bank account number: ${bankAccount} with ${bankName}

3. Financial Records & Bank Reconciliation
We have maintained complete financial records including General ledger entries, monthly bank reconciliation statements, and audit trail documentation.

ACCURACY AND AUTHENTICITY:
We confirm that all amounts stated in the cash vouchers match the corresponding bank transactions and that all expenses claimed are legitimate business expenses incurred in accordance with applicable Malaysian tax regulations.

REQUEST FOR CONSIDERATION:
We respectfully request LHDN to accept the submitted cash vouchers and supporting bank statements as evidence of the missing receipts for the Year of Assessment ${yearAssessment}.

Total amount of missing receipts: RM ${totalAmount}

Thank you for your consideration of this matter.

Yours faithfully,

${signatoryName}
${designation}
${companyName}`;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generateLetterContent());
        alert("Letter copied to clipboard!");
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: paperSize
        });

        const margin = 20;
        const pageWidth = paperSize === 'a4' ? 210 : 216; // A4: 210mm, Letter: 216mm
        const width = pageWidth - (margin * 2);
        let y = 20;
        const lineHeight = 5;

        // Letterhead
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(companyName, margin, y);
        y += 6;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const splitAddress = doc.splitTextToSize(address, width);
        doc.text(splitAddress, margin, y);
        y += (splitAddress.length * lineHeight);
        doc.text(`Phone: ${phone} | Email: ${email}`, margin, y);
        
        y += 10;
        doc.line(margin, y, margin + width, y);
        y += 10;

        // Date & Recipient
        const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.text(today, margin, y);
        y += 10;

        const splitLHDN = doc.splitTextToSize(`To:\n${lhdnAddress}`, width);
        doc.text(splitLHDN, margin, y);
        y += (splitLHDN.length * lineHeight) + 10;

        // Subject
        doc.setFont("helvetica", "bold");
        doc.text("RE: EXPLANATION FOR MISSING RECEIPTS", margin, y);
        y += lineHeight;
        doc.text(`YEAR OF ASSESSMENT ${yearAssessment}`, margin, y);
        y += lineHeight;
        doc.text(`COMPANY: ${companyName.toUpperCase()}`, margin, y);
        y += lineHeight;
        doc.text(`REGISTRATION NUMBER: ${regNo}`, margin, y);
        y += 10;

        // Body
        doc.setFont("helvetica", "normal");
        const bodyContent = [
            `Your Honour / Dear Director,`,
            ``,
            `This letter is submitted in explanation of the missing receipts and supporting documents relating to expenses incurred during the Year of Assessment ${yearAssessment}. Our company acknowledges the importance of maintaining proper documentation for all business transactions and regrets the loss of certain receipt records.`,
            ``,
            `CIRCUMSTANCES OF MISSING RECEIPTS:`,
            `${reason}`,
            ``,
            `As a result, we were unable to retain complete original receipts for all business expenses incurred. However, we have maintained comprehensive bank statements and financial reconciliation records for the entire fiscal year.`,
            ``,
            `SUPPORTING DOCUMENTATION:`,
            `In lieu of original receipts, we hereby submit the following supporting documentation:`,
            ``,
            `1. Cash Vouchers (Attached)`,
            `We have prepared detailed cash vouchers for all missing expense transactions during ${yearAssessment}. Each voucher has been prepared with complete details, cross-referenced with bank statements, signed by management, and numbered sequentially (${voucherStart} through ${voucherEnd}).`,
            ``,
            `2. Bank Statements (Attached)`,
            `Complete bank statements for the Year of Assessment ${yearAssessment} are enclosed. Bank account number: ${bankAccount} with ${bankName}.`,
            ``,
            `3. Financial Records & Bank Reconciliation`,
            `We have maintained complete financial records including General ledger entries and monthly bank reconciliation statements.`,
            ``,
            `ACCURACY AND AUTHENTICITY:`,
            `We confirm that all amounts stated in the cash vouchers match the corresponding bank transactions and that all expenses claimed are legitimate business expenses incurred in accordance with applicable Malaysian tax regulations.`,
            ``,
            `REQUEST FOR CONSIDERATION:`,
            `We respectfully request LHDN to accept the submitted cash vouchers and supporting bank statements as evidence of the missing receipts for the Year of Assessment ${yearAssessment}. Total amount: RM ${totalAmount}.`,
            ``,
            `Thank you for your consideration of this matter.`,
            ``,
            `Yours faithfully,`
        ];

        bodyContent.forEach(line => {
             const splitLine = doc.splitTextToSize(line, width);
             doc.text(splitLine, margin, y);
             y += (splitLine.length * lineHeight);
             const pageHeight = paperSize === 'a4' ? 297 : 279;
             if (y > (pageHeight - 20)) {
                 doc.addPage();
                 y = 20;
             }
        });

        y += 10;
        const pageHeight = paperSize === 'a4' ? 297 : 279;
        if (y > (pageHeight - 40)) { doc.addPage(); y = 20; }

        doc.setFont("helvetica", "bold");
        doc.text(signatoryName, margin, y);
        y += lineHeight;
        doc.setFont("helvetica", "normal");
        doc.text(designation, margin, y);
        y += lineHeight;
        doc.text(companyName, margin, y);

        doc.save('LHDN_Explanation_Letter.pdf');
    };

    return (
        <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto pb-12">
            <div>
                <h2 className="text-2xl font-bold text-gray-700 tracking-tight flex items-center gap-3">
                    <ScrollText className="text-blue-600" />
                    LHDN Letter Generator
                </h2>
                <p className="text-sm text-gray-500 mt-1">Draft formal explanation letters for missing receipts compliant with LHDN standards.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Configuration */}
                <div className="space-y-6">
                    <NeuroCard>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-600 uppercase tracking-wider">Company Information</h3>
                            <div className="flex items-center gap-4">
                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleScanLetterhead} 
                                    />
                                    <NeuroButton 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={scanning}
                                        className="!p-0 w-10 h-10 rounded-full flex items-center justify-center text-blue-600 shadow-[5px_5px_10px_rgba(163,177,198,0.6),-5px_-5px_10px_rgba(255,255,255,0.5)]"
                                    >
                                        {scanning ? <Loader2 size={18} className="animate-spin" /> : <ScanLine size={18} />}
                                    </NeuroButton>
                                    
                                    {/* Glass Hotspot Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-white/30 backdrop-blur-md border border-white/40 text-[10px] font-bold text-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm z-10">
                                        Scan Letterhead
                                    </div>
                                </div>
                                
                                <div className="flex items-center bg-[#e0e5ec] rounded-xl shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)] p-0.5">
                                    <NeuroSelect 
                                        value={paperSize} 
                                        onChange={(e) => setPaperSize(e.target.value as any)}
                                        className="!py-1 !px-2 !text-xs !bg-transparent !border-none !shadow-none w-24 h-8 text-gray-600 font-semibold"
                                    >
                                        <option value="a4">A4</option>
                                        <option value="letter">US Letter</option>
                                    </NeuroSelect>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Company Name</label>
                            <NeuroInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Registration No</label>
                                    <NeuroInput value={regNo} onChange={(e) => setRegNo(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Phone</label>
                                    <NeuroInput value={phone} onChange={(e) => setPhone(e.target.value)} />
                                </div>
                            </div>

                            <label className="block text-xs font-bold text-gray-500 uppercase">Address</label>
                            <NeuroTextarea 
                                rows={5} 
                                value={address} 
                                onChange={(e) => setAddress(e.target.value)} 
                                className="!resize-y min-h-[120px]" 
                            />
                            
                            <label className="block text-xs font-bold text-gray-500 uppercase">Email</label>
                            <NeuroInput value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                    </NeuroCard>

                    <NeuroCard title="Case Details">
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Year of Assessment</label>
                                    <NeuroInput value={yearAssessment} onChange={(e) => setYearAssessment(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Total Amount (RM)</label>
                                    <NeuroInput value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
                                </div>
                            </div>

                            <label className="block text-xs font-bold text-gray-500 uppercase flex justify-between items-center">
                                Reason for Loss
                                <NeuroButton 
                                    onClick={handlePolishReason} 
                                    disabled={isPolishing} 
                                    className="!py-1 !px-2 !text-[10px] flex items-center gap-1 text-purple-600"
                                >
                                    <Sparkles size={10} /> {isPolishing ? 'Refining...' : 'AI Polish'}
                                </NeuroButton>
                            </label>
                            <NeuroTextarea 
                                rows={12} 
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)} 
                                className="text-sm !resize-y min-h-[300px]"
                                placeholder="Explain why receipts are missing..."
                            />
                        </div>
                    </NeuroCard>

                    <NeuroCard title="Supporting Docs & Signatory">
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Voucher Start No.</label>
                                    <NeuroInput value={voucherStart} onChange={(e) => setVoucherStart(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Voucher End No.</label>
                                    <NeuroInput value={voucherEnd} onChange={(e) => setVoucherEnd(e.target.value)} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Bank Name</label>
                                    <NeuroInput value={bankName} onChange={(e) => setBankName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Account No</label>
                                    <NeuroInput value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-300/30 mt-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Signatory</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <NeuroInput placeholder="Name" value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} />
                                    <NeuroInput placeholder="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </NeuroCard>
                </div>

                {/* Right: Preview */}
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-600">Letter Preview</h3>
                            <NeuroBadge color="text-gray-500 bg-gray-200 uppercase">{paperSize}</NeuroBadge>
                        </div>
                        <div className="flex gap-2">
                            <NeuroButton onClick={handleCopy} className="!py-2 !px-3 text-xs text-gray-600">
                                <Copy size={14} className="mr-1 inline" /> Copy
                            </NeuroButton>
                            <NeuroButton onClick={handleDownloadPDF} className="!py-2 !px-3 text-xs text-blue-600">
                                <Download size={14} className="mr-1 inline" /> PDF
                            </NeuroButton>
                        </div>
                    </div>

                    <div className="flex-1 bg-white shadow-2xl rounded-sm p-8 md:p-12 overflow-y-auto min-h-[800px] border border-gray-200 text-sm leading-relaxed text-gray-800 font-serif relative">
                         {/* Watermark/Guide */}
                         <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                             <FileCheck size={100} />
                         </div>

                        {/* Letter Content Render */}
                        <div className="whitespace-pre-wrap font-[Times New Roman]">
                            <div className="font-bold">{companyName}</div>
                            <div className="text-gray-600 mb-4">{address}</div>
                            <div className="mb-6">
                                Phone: {phone}<br/>
                                Email: {email}
                            </div>

                            <div className="mb-6">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>

                            <div className="mb-6">
                                To:<br/>
                                {lhdnAddress}
                            </div>

                            <div className="font-bold mb-6 underline">
                                RE: EXPLANATION FOR MISSING RECEIPTS<br/>
                                YEAR OF ASSESSMENT {yearAssessment}<br/>
                                COMPANY: {companyName.toUpperCase()}<br/>
                                REGISTRATION NUMBER: {regNo}
                            </div>

                            <div className="mb-4">Your Honour / Dear Director,</div>

                            <p className="mb-4 text-justify">
                                This letter is submitted in explanation of the missing receipts and supporting documents relating to
                                expenses incurred during the Year of Assessment {yearAssessment}. Our company acknowledges the importance of
                                maintaining proper documentation for all business transactions and regrets the loss of certain receipt
                                records.
                            </p>

                            <div className="font-bold mb-2">CIRCUMSTANCES OF MISSING RECEIPTS:</div>
                            <p className="mb-4 text-justify">{reason}</p>

                            <p className="mb-4 text-justify">
                                As a result, we were unable to retain complete original receipts for all business expenses incurred. However, we have maintained comprehensive bank statements and financial reconciliation records for the entire fiscal year.
                            </p>

                            <div className="font-bold mb-2">SUPPORTING DOCUMENTATION:</div>
                            <p className="mb-2">In lieu of original receipts, we hereby submit the following supporting documentation:</p>

                            <div className="ml-4 mb-4">
                                <div className="font-bold">1. Cash Vouchers (Attached)</div>
                                <p className="text-justify mb-2">
                                    We have prepared detailed cash vouchers for all missing expense transactions during {yearAssessment}. Each
                                    voucher has been:
                                </p>
                                <ul className="list-disc ml-5 mb-2">
                                    <li>Prepared with complete details of the transaction</li>
                                    <li>Cross-referenced with our bank statements</li>
                                    <li>Signed and approved by appropriate management personnel</li>
                                    <li>Numbered sequentially ({voucherStart} through ${voucherEnd})</li>
                                </ul>

                                <div className="font-bold mt-3">2. Bank Statements (Attached)</div>
                                <p className="text-justify mb-2">
                                    Complete bank statements for the Year of Assessment {yearAssessment} are enclosed, which clearly show:
                                </p>
                                <ul className="list-disc ml-5 mb-2">
                                    <li>All funds disbursed for business operations</li>
                                    <li>Dates, amounts, and reference information for each transaction</li>
                                    <li>Clear traceability between bank records and expense vouchers</li>
                                    <li>Bank account number: {bankAccount} with {bankName}</li>
                                </ul>
                            </div>

                            <div className="font-bold mb-2">ACCURACY AND AUTHENTICITY:</div>
                            <p className="mb-4 text-justify">
                                We confirm that all amounts stated in the cash vouchers match the corresponding bank transactions
                                and that all expenses claimed are legitimate business expenses incurred in accordance with applicable Malaysian
                                tax regulations.
                            </p>

                            <div className="font-bold mb-2">REQUEST FOR CONSIDERATION:</div>
                            <p className="mb-4 text-justify">
                                We respectfully request LHDN to accept the submitted cash vouchers and supporting bank statements as
                                evidence of the missing receipts for the Year of Assessment {yearAssessment}.
                            </p>
                            
                            <p className="mb-6 font-bold">Total amount of missing receipts: RM {totalAmount}</p>

                            <p className="mb-8">Thank you for your consideration of this matter.</p>

                            <div className="mb-8">
                                Yours faithfully,
                            </div>

                            <div className="mt-12">
                                <div className="font-bold">{signatoryName}</div>
                                <div>{designation}</div>
                                <div>{companyName}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
             {/* Info Tip */}
             <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <HelpCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-800">
                    <strong>Submission Tip:</strong> Always attach the original signed cash vouchers and certified true copies of bank statements when submitting this letter to the LHDN branch handling your tax file.
                </div>
             </div>

             {/* Guidance & Checklist Section */}
             <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <NeuroCard title="Submission Checklist" className="lg:col-span-1 h-full">
                    <ul className="space-y-4">
                        {CHECKLIST_ITEMS.map((item, idx) => (
                            <li key={idx} className="flex gap-3 items-start">
                                <div className="min-w-[24px] h-[24px] rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold mt-0.5 shrink-0">
                                    {idx + 1}
                                </div>
                                <span className="text-sm text-gray-600 leading-snug">{item}</span>
                            </li>
                        ))}
                    </ul>
                </NeuroCard>

                <NeuroCard title="Practical Guidance" className="lg:col-span-2 h-full">
                     <div className="space-y-6">
                        <div className="flex gap-4 items-start bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <Info className="text-blue-500 shrink-0 mt-1" size={20} />
                            <div>
                                <h4 className="font-bold text-blue-800 text-sm mb-1">When to use this letter?</h4>
                                <p className="text-sm text-blue-700/80 leading-relaxed">
                                    Use this standard explanation format when you have lost original tax invoices or receipts (e.g., lost in transit, faded thermal paper, destroyed by flood/fire) but can prove the expense via bank statements. This letter formally requests LHDN's discretion under <strong>Section 33 of the Income Tax Act 1967</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <h4 className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-orange-500"/> Do's
                                </h4>
                                <ul className="text-sm text-gray-600 space-y-2 list-disc ml-4">
                                    <li>Print on official Company Letterhead.</li>
                                    <li>Ensure the <strong>Signatory</strong> is a Director or authorized Finance Manager.</li>
                                    <li>Attach the specific bank statement page with the relevant transaction highlighted.</li>
                                </ul>
                             </div>
                             <div>
                                <h4 className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2">
                                     <XCircle size={16} className="text-red-500"/> Don'ts
                                </h4>
                                <ul className="text-sm text-gray-600 space-y-2 list-disc ml-4">
                                    <li>Do not group unrelated expenses; use separate vouchers.</li>
                                    <li>Do not use this for personal expenses disguised as business costs.</li>
                                    <li>Do not sign without verifying the bank trail.</li>
                                </ul>
                             </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <h4 className="font-bold text-gray-700 text-sm mb-2">Sample Reference Text</h4>
                            <div className="bg-[#e0e5ec] shadow-[inset_6px_6px_10px_rgba(163,177,198,0.6),inset_-6px_-6px_10px_rgba(255,255,255,0.5)] p-4 rounded-lg text-xs text-gray-500 font-mono leading-relaxed h-32 overflow-y-auto border border-gray-200/50">
                                {`[Company Name]\n[Address]\n\n[Date]\n\nLembaga Hasil Dalam Negeri\nRE: EXPLANATION FOR MISSING RECEIPTS\n\nDear Sir/Madam,\n\nWe refer to the above matter. We regret to inform you that original receipts for the following expenses were [Reason for Loss]...\n\n(This structure is automatically generated in the preview above)`}
                            </div>
                        </div>
                     </div>
                </NeuroCard>
            </div>
        </div>
    );
};