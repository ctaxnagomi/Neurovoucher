import React, { useState } from 'react';
import { NeuroCard, NeuroInput, NeuroButton, NeuroTextarea, NeuroBadge } from '../components/NeuroComponents';
import { generateFastSummary } from '../services/geminiService';
import { Download, Copy, Sparkles, Printer, FileCheck, ShieldCheck, HelpCircle, ScrollText } from 'lucide-react';
import { jsPDF } from "jspdf";

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
• Numbered sequentially for easy identification (${voucherStart} through ${voucherEnd})

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
            format: 'a4'
        });

        const margin = 20;
        const width = 170;
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
            "Your Honour / Dear Director,",
            "",
            `This letter is submitted in explanation of the missing receipts and supporting documents relating to expenses incurred during the Year of Assessment ${yearAssessment}. Our company acknowledges the importance of maintaining proper documentation for all business transactions and regrets the loss of certain receipt records.`,
            "",
            "CIRCUMSTANCES OF MISSING RECEIPTS:",
            reason,
            "",
            "As a result, we were unable to retain complete original receipts for all business expenses incurred. However, we have maintained comprehensive bank statements and financial reconciliation records for the entire fiscal year.",
            "",
            "SUPPORTING DOCUMENTATION:",
            "In lieu of original receipts, we hereby submit the following supporting documentation:",
            "",
            "1. Cash Vouchers (Attached)",
            `We have prepared detailed cash vouchers for all missing expense transactions during ${yearAssessment}. Each voucher has been prepared with complete details, cross-referenced with bank statements, signed by management, and numbered sequentially (${voucherStart} through ${voucherEnd}).`,
            "",
            "2. Bank Statements (Attached)",
            `Complete bank statements for the Year of Assessment ${yearAssessment} are enclosed. Bank account number: ${bankAccount} with ${bankName}.`,
            "",
            "3. Financial Records & Bank Reconciliation",
            "We have maintained complete financial records including General ledger entries and monthly bank reconciliation statements.",
            "",
            "ACCURACY AND AUTHENTICITY:",
            "We confirm that all amounts stated in the cash vouchers match the corresponding bank transactions and that all expenses claimed are legitimate business expenses incurred in accordance with applicable Malaysian tax regulations.",
            "",
            "REQUEST FOR CONSIDERATION:",
            `We respectfully request LHDN to accept the submitted cash vouchers and supporting bank statements as evidence of the missing receipts. Total amount: RM ${totalAmount}.`,
            "",
            "Thank you for your consideration of this matter.",
            "",
            "Yours faithfully,"
        ];

        bodyContent.forEach(line => {
             const splitLine = doc.splitTextToSize(line, width);
             doc.text(splitLine, margin, y);
             y += (splitLine.length * lineHeight);
             // Page break check simple
             if (y > 270) {
                 doc.addPage();
                 y = 20;
             }
        });

        y += 10;
        if (y > 250) { doc.addPage(); y = 20; }

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
                    <NeuroCard title="Company Information">
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
                            <NeuroTextarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className="resize-none" />
                            
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
                                <button onClick={handlePolishReason} disabled={isPolishing} className="text-[10px] flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-0.5 rounded hover:bg-purple-100 transition-colors">
                                    <Sparkles size={10} /> {isPolishing ? 'Refining...' : 'AI Professional Polish'}
                                </button>
                            </label>
                            <NeuroTextarea 
                                rows={4} 
                                value={reason} 
                                onChange={(e) => setReason(e.target.value)} 
                                className="resize-none text-sm"
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

                            <div className="pt-2 border-t border-gray-200 mt-2">
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
                        <h3 className="text-lg font-bold text-gray-600">Letter Preview</h3>
                        <div className="flex gap-2">
                            <NeuroButton onClick={handleCopy} className="!py-2 !px-3 text-xs bg-white text-gray-600 border border-gray-200 shadow-sm hover:bg-gray-50">
                                <Copy size={14} className="mr-1 inline" /> Copy
                            </NeuroButton>
                            <NeuroButton onClick={handleDownloadPDF} className="!py-2 !px-3 text-xs bg-blue-600 text-white shadow-md hover:bg-blue-700">
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
                                    <li>Numbered sequentially ({voucherStart} through {voucherEnd})</li>
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
        </div>
    );
};