// [REF-004] Template Designer & UI Redesign
// Credit : Wan Mohd Azizi (Rikayu Wilzam)

import React, { useState } from 'react';
import { TunaiCard, TunaiInput, TunaiButton, TunaiTextarea } from '../components/TunaiComponents';
import { Printer, Save, FileText, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const TemplateDesigner: React.FC = () => {
    const { t } = useLanguage();
    const [templateName, setTemplateName] = useState("LHDN-COMPLIANT-TEMPLATE-MAX");
    const [tin, setTin] = useState("C2584563200");
    const [sst, setSst] = useState("B12-1808-32000000");
    const [msic, setMsic] = useState("62010");
    const [buyerTin, setBuyerTin] = useState("IG1234567890");
    const [invoiceDetails, setInvoiceDetails] = useState("Valid e-Invoice for tax purposes.");
    const [footerText, setFooterText] = useState("Computer generated invoice. No signature required.");
    
    // Preview Data
    const dummyItems = [
        { desc: "Consultation Services", amount: "500.00", code: "001" },
        { desc: "Software License", amount: "1200.00", code: "023" }
    ];

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 p-4 animate-in fade-in duration-500">
            
            {/* LEFT: Editor Panel (Glass) */}
            <div className="w-full md:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 no-scrollbar">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold text-slate-900 drop-shadow-sm">{t('eInvoiceConfig')}</h1>
                    <button className="p-2 hover:bg-white/50 rounded-full transition-colors" title="Save Template" aria-label="Save Template">
                        <Save size={20} className="text-slate-700" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-white/40 rounded-xl border border-white/50 shadow-sm">
                        <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Supplier Info (LHDN)
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">TIN (Tax ID)</label>
                                <TunaiInput value={tin} onChange={(e) => setTin(e.target.value)} className="text-xs h-8" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">SST No</label>
                                <TunaiInput value={sst} onChange={(e) => setSst(e.target.value)} className="text-xs h-8" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">MSIC Code</label>
                                <TunaiInput value={msic} onChange={(e) => setMsic(e.target.value)} className="text-xs h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-white/40 rounded-xl border border-white/50 shadow-sm">
                        <h3 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span> Buyer Info
                        </h3>
                         <div className="col-span-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Buyer TIN</label>
                            <TunaiInput value={buyerTin} onChange={(e) => setBuyerTin(e.target.value)} className="text-xs h-8" />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-md font-bold text-slate-800 mb-2">Invoice details</h3>
                        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Memo</label>
                        <TunaiTextarea 
                            className="bg-white/50 border-slate-200 resize-none min-h-[80px] text-xs"
                            value={invoiceDetails}
                            onChange={(e) => setInvoiceDetails(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-auto pt-6">
                     <TunaiButton className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 border-0">
                        <Save size={16} className="mr-2" /> Save LHDN Template
                     </TunaiButton>
                </div>
            </div>

            {/* RIGHT: Preview Panel (Paper on Glass) */}
            <div className="flex-1 bg-slate-100/50 backdrop-blur-sm rounded-2xl border border-white/40 p-8 flex items-center justify-center relative overflow-hidden shadow-inner">
                
                {/* Visual Validation Badge */}
                 <div className="absolute top-6 left-6 flex gap-2 pointer-events-none z-10">
                     <div className="bg-green-100/90 backdrop-blur px-3 py-1.5 rounded-full border border-green-200 text-xs text-green-700 shadow-sm flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> LHDN COMPLIANT
                     </div>
                </div>

                {/* A4 Paper Preview */}
                <div className="bg-white w-full max-w-[595px] aspect-[1/1.414] shadow-2xl rounded-sm p-8 md:p-12 text-slate-900 text-xs transform scale-[0.85] md:scale-100 transition-transform origin-top relative">
                    
                    {/* QR Code Placeholder (Top Right - Standard Placement for some layouts, usually bottom but flexible) */}
                    <div className="absolute top-10 right-10 w-24 h-24 border-2 border-slate-800 p-1 flex items-center justify-center bg-white">
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-[8px] text-center font-mono leading-none p-1">
                            LHDN<br/>VALIDATED<br/>QR CODE
                        </div>
                    </div>

                    {/* Header Info */}
                    <div className="mb-10 mr-32"> {/* Right margin for QR code */}
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">E-INVOICE</h1>
                         <div className="text-[10px] space-y-0.5 text-slate-600">
                             <p>Serial No: <span className="font-mono font-bold text-slate-900">INV-2026-001</span></p>
                             <p>Date: <span className="font-bold text-slate-900">15 Jan 2026</span></p>
                             <p>UUID: <span className="font-mono text-[9px] text-slate-500">c49839-449-343-434343434343</span></p>
                         </div>
                    </div>

                    {/* Parties Section */}
                    <div className="grid grid-cols-2 gap-8 mb-10 border-b-2 border-slate-100 pb-8">
                         {/* Supplier */}
                         <div>
                             <h3 className="font-bold text-sm mb-2 text-blue-900">SUPPLIER</h3>
                             <p className="font-bold text-lg leading-tight mb-2">TunaiCukai Solutions</p>
                             <div className="space-y-1 text-[10px] text-slate-600">
                                 <p>TIN: <span className="font-mono font-bold">{tin}</span></p>
                                 <p>Reg No: <span className="font-mono">202401001234</span></p>
                                 <p>SST: {sst}</p>
                                 <p>MSIC: {msic}</p>
                                 <p className="mt-2 text-slate-500">
                                     Lot 2565 RPR Tanjung Kidurong,<br/>
                                     97000 Bintulu, Sarawak, Malaysia
                                 </p>
                             </div>
                         </div>
                         
                         {/* Buyer */}
                         <div>
                             <h3 className="font-bold text-sm mb-2 text-green-900">BUYER</h3>
                             <p className="font-bold text-lg leading-tight mb-2">Example Customer Sdn Bhd</p>
                             <div className="space-y-1 text-[10px] text-slate-600">
                                 <p>TIN: <span className="font-mono font-bold">{buyerTin}</span></p>
                                 <p>Reg No: <span className="font-mono">199001000001</span></p>
                                 <p>Address:</p>
                                 <p className="text-slate-500">
                                     Level 10, Tower B, The Highrise,<br/>
                                     50450 Kuala Lumpur, Malaysia
                                 </p>
                             </div>
                         </div>
                    </div>

                    {/* Line Items */}
                    <div className="mb-8">
                         <table className="w-full text-left">
                             <thead>
                                 <tr className="border-b-2 border-slate-900 text-[10px] uppercase font-bold tracking-wider">
                                     <th className="pb-2 w-16">No.</th>
                                     <th className="pb-2">Description</th>
                                     <th className="pb-2 w-24 text-center">Class. Code</th>
                                     <th className="pb-2 w-24 text-right">Amount (RM)</th>
                                 </tr>
                             </thead>
                             <tbody className="text-[11px] divide-y divide-slate-100">
                                 {dummyItems.map((item, i) => (
                                     <tr key={i}>
                                         <td className="py-3 text-slate-500">{i + 1}</td>
                                         <td className="py-3 font-medium">{item.desc}</td>
                                         <td className="py-3 text-center text-slate-500 font-mono text-[10px]">{item.code}</td>
                                         <td className="py-3 text-right font-bold">{item.amount}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                    </div>

                    {/* Totals Section */}
                    <div className="flex justify-end mb-12">
                        <div className="w-1/2 space-y-2">
                             <div className="flex justify-between text-[11px]">
                                 <span className="text-slate-500">Subtotal</span>
                                 <span>1,700.00</span>
                             </div>
                             <div className="flex justify-between text-[11px]">
                                 <span className="text-slate-500">Tax (0%)</span>
                                 <span>0.00</span>
                             </div>
                             <div className="flex justify-between text-sm font-bold border-t-2 border-slate-900 pt-2 mt-2">
                                 <span>Total Payable</span>
                                 <span>RM 1,700.00</span>
                             </div>
                        </div>
                    </div>

                    {/* Footer / Validation Hash */}
                    <div className="mt-auto pt-6 border-t border-slate-100">
                         <div className="flex items-center gap-4 mb-4">
                             <img src="/tunaicukaimy-logo.png" alt="Logo" className="w-12 h-auto opacity-80 mix-blend-multiply" />
                             <div>
                                 <p className="text-[9px] font-bold text-slate-700">Digital Signature</p>
                                 <p className="font-mono text-[8px] text-slate-400 break-all leading-tight">
                                     e2d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a-5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0
                                 </p>
                             </div>
                         </div>
                         <p className="text-[9px] text-slate-400 text-center uppercase tracking-widest">
                             This is a computer generated document. No signature is required.
                         </p>
                    </div>
                </div>
            </div>

        </div>
    );
};
