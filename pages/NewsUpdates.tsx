// [REF-003] News & In-Depth Tax Logic Integration
// Credit : Wan Mohd Azizi (Rikayu Wilzam)

import React from 'react';
import { TunaiCard } from '../components/TunaiComponents';
import { FileText, User, Heart, ShoppingBag, Shield, Baby } from 'lucide-react';

const ReliefCard = ({ title, amount, icon: Icon, items }: { title: string, amount: string, icon: any, items: string[] }) => (
    <TunaiCard className="h-full border border-slate-200 hover:border-blue-300 transition-all duration-300 group">
        <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Icon size={24} />
                </div>
                <h3 className="font-bold text-lg text-slate-800">{title}</h3>
            </div>
            <div className="text-right">
                 <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Up To</span>
                 <p className="font-black text-xl text-blue-600">{amount}</p>
            </div>
        </div>
        <ul className="space-y-2">
            {items.map((item, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-200 mt-1.5 flex-shrink-0"></span>
                    {item}
                </li>
            ))}
        </ul>
    </TunaiCard>
);

export const NewsUpdates: React.FC = () => {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">News & Updates</h1>
            <p className="text-slate-500">Official Individual Tax Reliefs for the Year of Assessment 2025.</p>
        </div>

        {/* Hero Banner / Highlight */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 mb-10 shadow-lg">
            <div className="relative z-10 max-w-2xl">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold mb-4 border border-white/30">
                    TAX YEAR 2025
                </span>
                <h2 className="text-3xl font-black mb-4">Optimize Your Tax Savings</h2>
                <p className="text-blue-100 mb-6 leading-relaxed">
                    The government has released the official list of individual tax reliefs for 2025. 
                    Ensure you keep receipts for lifestyle, medical, and education expenses to maximize your claims.
                </p>
            </div>
            {/* Abstract Background Decoration */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 transform translate-x-12"></div>
            <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl"></div>
        </div>

        {/* Relief Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <ReliefCard 
                title="Individual & Family"
                amount="RM 9,000"
                icon={User}
                items={[
                    "Individual & Dependent Relatives: RM9,000",
                    "Spouse / Alimony Payments: RM4,000",
                    "Disabled Individual: RM7,000",
                    "Disabled Spouse: RM6,000"
                ]}
            />

            <ReliefCard 
                title="Education"
                amount="RM 7,000"
                icon={FileText}
                items={[
                    "Education Fees (Degree+ or any level if Law/Accounting/Islamic/Tech/Vocational/etc): RM7,000",
                    "Upskilling Courses: RM2,000",
                    "SSPN (Net Savings): RM8,000"
                ]}
            />

            <ReliefCard 
                title="Housing Interest"
                amount="RM 7,000"
                icon={Shield}
                items={[
                    "Property price up to RM500,000: RM7,000",
                    "Property price RM500,001 - RM750,000: RM5,000",
                    "Housing Loan Interest for First Home Ownership (S&P 2025-2027)"
                ]}
            />

            <ReliefCard 
                title="Medical & Needs"
                amount="RM 10,000"
                icon={Heart}
                items={[
                    "Self, Spouse or Child (Serious illness, fertility): RM10,000",
                    "Vaccination / Medical Exam / Dental: Limited to RM1,000",
                    "Child Learning Disability Diagnosis/Intervention: RM6,000",
                    "Parents & Grandparents (Medical/Care): RM8,000",
                    "Basic Equip. for Disabled (OKU): RM6,000"
                ]}
            />

            <ReliefCard 
                title="Lifestyle & EV"
                amount="RM 2,500"
                icon={ShoppingBag}
                items={[
                    "Books, PC, Smartphone, Internet, Gym, Sports Equip: RM2,500",
                    "Additional Relief (Sports): RM1,000",
                    "EV Charging Equip & Composting Machine: RM2,500"
                ]}
            />

            <ReliefCard 
                title="Insurance & EPF"
                amount="RM 7,000"
                icon={Shield}
                items={[
                    "Life Insurance & KWSP (EPF): RM7,000",
                    "Private Retirement Scheme (PRS): RM3,000",
                    "Education & Medical Insurance: RM4,000",
                    "PERKESO Contributions: RM350"
                ]}
            />

            <ReliefCard 
                title="Child Reliefs"
                amount="RM 8,000"
                icon={Baby}
                items={[
                    "Child < 18 unmarried: RM2,000",
                    "Child 18+ full-time student (Degree+): RM8,000",
                    "Disabled Child: RM6,000",
                    "Disabled Child 18+ (Higher Edu): Additional RM8,000",
                    "Childcare / Kindergarten Fees: RM3,000",
                    "Breastfeeding Equipment: RM1,000"
                ]}
            />

        </div>
    </div>
  );
};
