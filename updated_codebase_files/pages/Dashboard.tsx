import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeuroCard, NeuroBadge } from '../components/NeuroComponents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Timer, Zap, ShieldCheck, Info, Mic } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const weeklyData = [
  { name: 'Mon', amt: 2400, type: 10, freq: 5, tax: 2100 },
  { name: 'Tue', amt: 1398, type: 8, freq: 3, tax: 1150 },
  { name: 'Wed', amt: 9800, type: 15, freq: 12, tax: 8900 },
  { name: 'Thu', amt: 3908, type: 12, freq: 8, tax: 3500 },
  { name: 'Fri', amt: 4800, type: 20, freq: 10, tax: 4200 },
  { name: 'Sat', amt: 3800, type: 5, freq: 4, tax: 3100 },
  { name: 'Sun', amt: 4300, type: 8, freq: 6, tax: 3800 },
];

const annualData = [
  { name: 'Jan', amt: 12000, type: 45, freq: 20, tax: 10500 },
  { name: 'Feb', amt: 15000, type: 50, freq: 25, tax: 13200 },
  { name: 'Mar', amt: 11000, type: 40, freq: 22, tax: 9800 },
  { name: 'Apr', amt: 18000, type: 60, freq: 30, tax: 16500 },
  { name: 'May', amt: 22000, type: 70, freq: 35, tax: 19800 },
  { name: 'Jun', amt: 25000, type: 80, freq: 40, tax: 22500 },
  { name: 'Jul', amt: 21000, type: 65, freq: 32, tax: 18900 },
  { name: 'Aug', amt: 23000, type: 75, freq: 38, tax: 20500 },
  { name: 'Sep', amt: 19000, type: 55, freq: 28, tax: 16800 },
  { name: 'Oct', amt: 26000, type: 85, freq: 42, tax: 23400 },
  { name: 'Nov', amt: 24000, type: 78, freq: 39, tax: 21600 },
  { name: 'Dec', amt: 28000, type: 90, freq: 45, tax: 25200 },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<'Weekly' | 'Annually'>('Weekly');
  const [metric, setMetric] = useState<'amt' | 'type' | 'freq' | 'tax'>('amt');
  const [viewMode, setViewMode] = useState<'expenditure' | 'taxCompliance'>('expenditure');

  // LHDN Tax Submission Countdown (Mock: June 30th deadline)
  const today = new Date();
  const currentYear = today.getFullYear();
  let deadline = new Date(currentYear, 5, 30); // June 30
  if (today > deadline) deadline.setFullYear(currentYear + 1);
  const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Process data to include non-deductible amount
  const rawData = timeRange === 'Weekly' ? weeklyData : annualData;
  const currentData = rawData.map(item => ({
      ...item,
      nonDeductible: item.amt - item.tax
  }));

  const activeColor = 
    metric === 'amt' ? '#63b3ed' : 
    metric === 'type' ? '#9f7aea' : 
    metric === 'freq' ? '#48bb78' : 
    '#ed8936'; // Orange for Tax

  const handleFixInsight = (context: string) => {
    navigate('/chat', { state: { initialInput: `I need help fixing this issue: "${context}". What should I do?` } });
  };

  return (
    <div className="space-y-8">
      {/* Feature Guide: Live Agent */}
      <div 
        onClick={() => navigate('/live')}
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-lg relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01]"
      >
          <div className="absolute right-0 top-0 h-full w-1/3 bg-white/10 skew-x-12 transform translate-x-12"></div>
          <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse">
                  <Mic className="text-white" size={24} />
              </div>
              <div className="text-white">
                  <h3 className="text-lg font-bold">{t('startSession')}</h3>
                  <p className="text-xs text-blue-100 opacity-90">Hands-free navigation, screen-aware form filling, and real-time guidance. Tap here to start.</p>
              </div>
          </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeuroCard>
          <div className="text-gray-500 text-sm font-medium">{t('totalExpenses')}</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">RM 45,231.00</div>
          <div className="mt-4 flex gap-2">
             <NeuroBadge color="text-green-600">+12%</NeuroBadge>
             <span className="text-xs text-gray-400 flex items-center">vs last month</span>
          </div>
        </NeuroCard>
        <NeuroCard>
          <div className="text-gray-500 text-sm font-medium">{t('pendingVouchers')}</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">14</div>
           <div className="mt-4 flex gap-2">
             <NeuroBadge color="text-orange-600">{t('actionRequired')}</NeuroBadge>
          </div>
        </NeuroCard>
        <NeuroCard>
          <div className="text-gray-500 text-sm font-medium">{t('aiOptimizations')}</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">89</div>
           <div className="mt-4 flex gap-2">
             <NeuroBadge color="text-purple-600">Gemini 3.0</NeuroBadge>
          </div>
        </NeuroCard>
      </div>

      {/* Main Chart Section with Toggles */}
      <NeuroCard className="h-[550px] flex flex-col relative">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-600 uppercase tracking-wider">
                        {t(timeRange.toLowerCase())} {viewMode === 'expenditure' ? t('expenditure') : t('taxDeductibility')}
                    </h3>
                    {viewMode === 'taxCompliance' && (
                        <div className="group relative z-20">
                            <Info size={18} className="text-blue-500 cursor-help" />
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-72 bg-white border border-blue-100 shadow-xl rounded-xl p-4 opacity-0 group-hover:opacity-100 transition-all pointer-events-none scale-95 group-hover:scale-100 origin-left">
                                <div className="flex items-start gap-3 mb-2">
                                    <div className="bg-blue-50 p-2 rounded-lg">
                                        <ShieldCheck size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <strong className="text-xs font-bold text-gray-700 block">LHDN Public Ruling 4/2020</strong>
                                        <span className="text-[10px] text-gray-400">Latest Publication</span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Expenses must be wholly and exclusively incurred in the production of gross income.
                                    <br/><br/>
                                    <span className="text-red-500 font-bold">Non-Deductible:</span> Private expenses, initial capital, 50% of entertainment.
                                </p>
                                <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-blue-500 font-medium">
                                    Tap to ask AI Advisor for details
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {/* Mode Toggle */}
                    <div className="flex bg-gray-100/50 p-1 rounded-xl w-fit">
                        <button 
                            onClick={() => setViewMode('expenditure')}
                            className={`text-xs px-4 py-1.5 rounded-lg transition-all duration-300 font-medium ${viewMode === 'expenditure' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t('summary')}
                        </button>
                        <button 
                            onClick={() => setViewMode('taxCompliance')}
                            className={`text-xs px-4 py-1.5 rounded-lg transition-all duration-300 font-medium flex items-center gap-2 ${viewMode === 'taxCompliance' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t('taxDeductibility')}
                        </button>
                    </div>

                     {/* Time Toggle */}
                    <div className="flex bg-gray-100/50 p-1 rounded-xl w-fit">
                        <button 
                            onClick={() => setTimeRange('Weekly')}
                            className={`text-xs px-4 py-1.5 rounded-lg transition-all duration-300 font-medium ${timeRange === 'Weekly' ? 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t('weekly')}
                        </button>
                        <button 
                            onClick={() => setTimeRange('Annually')}
                            className={`text-xs px-4 py-1.5 rounded-lg transition-all duration-300 font-medium ${timeRange === 'Annually' ? 'bg-white text-gray-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t('annually')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tax Deadline Countdown Widget */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-right duration-500 shadow-sm mt-4 xl:mt-0 w-full xl:w-auto">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                    <Timer size={20} />
                </div>
                <div>
                    <div className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">{t('taxFiling')}</div>
                    <div className="text-sm font-bold text-gray-700 leading-tight">
                    {daysLeft} {t('daysLeft')} <span className="text-xs font-normal text-gray-500 block sm:inline">to prepare submission</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096', fontSize: 12}} />
              <Tooltip 
                  cursor={{fill: '#cbd5e0', opacity: 0.2}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '9px 9px 16px rgba(163,177,198,0.6)', backgroundColor: '#e0e5ec', color: '#4a5568' }}
              />
              
              {viewMode === 'expenditure' ? (
                  <Bar dataKey={metric} radius={[6, 6, 0, 0]} animationDuration={500}>
                    {currentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={activeColor} />
                    ))}
                  </Bar>
              ) : (
                  <>
                    <Legend 
                        verticalAlign="top" 
                        align="right"
                        height={36} 
                        iconType="circle"
                        wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#718096' }}
                    />
                    <Bar dataKey="tax" name="Tax Deductible" stackId="a" fill="#48bb78" radius={[0, 0, 4, 4]} animationDuration={500} />
                    <Bar dataKey="nonDeductible" name="Non-Deductible" stackId="a" fill="#fc8181" radius={[4, 4, 0, 0]} animationDuration={500} />
                  </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Metric Toggles - Only visible in Overview mode */}
        {viewMode === 'expenditure' && (
            <div className="mt-6 flex justify-center gap-2 sm:gap-4 border-t border-gray-200/50 pt-4 overflow-x-auto pb-2 sm:pb-0">
                <button 
                    onClick={() => setMetric('amt')} 
                    className={`text-xs font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${metric === 'amt' ? 'bg-blue-50 text-blue-600 shadow-inner ring-1 ring-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    {t('totalAmount')}
                </button>
                <button 
                    onClick={() => setMetric('type')} 
                    className={`text-xs font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${metric === 'type' ? 'bg-purple-50 text-purple-600 shadow-inner ring-1 ring-purple-100' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    Voucher Type
                </button>
                <button 
                    onClick={() => setMetric('freq')} 
                    className={`text-xs font-bold px-4 py-2 rounded-xl transition-all whitespace-nowrap ${metric === 'freq' ? 'bg-green-50 text-green-600 shadow-inner ring-1 ring-green-100' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                    Category Frequency
                </button>
            </div>
        )}
      </NeuroCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NeuroCard title={t('recentActivity')}>
              <ul className="space-y-4">
                  {[1,2,3].map(i => (
                      <li key={i} className="flex justify-between items-center pb-2 border-b border-gray-300/30 last:border-0">
                          <div>
                              <div className="font-semibold text-gray-700">Grab Transport</div>
                              <div className="text-xs text-gray-500">Transportation • Pending</div>
                          </div>
                          <div className="font-bold text-gray-600">- RM 45.00</div>
                      </li>
                  ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-gray-200/50 text-center">
                  <p className="text-xs text-blue-500 italic flex items-center justify-center gap-2">
                     <ShieldCheck size={12} />
                     Filtered by LHDN Tax Deductibility Standards
                  </p>
              </div>
          </NeuroCard>

          <NeuroCard title={t('aiInsights')}>
              <div className="space-y-4">
                  <div 
                    onClick={() => handleFixInsight('3 duplicate receipts from Speedmart 99')}
                    className="group bg-blue-100/50 p-4 rounded-xl text-sm text-blue-800 border border-blue-200/50 relative overflow-hidden cursor-pointer hover:shadow-md hover:bg-blue-100 transition-all"
                  >
                      <strong>Gemini Flash Lite:</strong> You have 3 duplicate receipts from "Speedmart 99". Consider consolidating.
                      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white/90 to-transparent flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white text-blue-600 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                            <Zap size={10} /> Fix
                        </span>
                      </div>
                  </div>
                  
                  <div 
                    onClick={() => handleFixInsight('Travel expenses are 15% higher than the monthly average')}
                    className="group bg-purple-100/50 p-4 rounded-xl text-sm text-purple-800 border border-purple-200/50 relative overflow-hidden cursor-pointer hover:shadow-md hover:bg-purple-100 transition-all"
                  >
                      <strong>Gemini 3 Pro:</strong> Your travel expenses are 15% higher than the monthly average.
                      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white/90 to-transparent flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="bg-white text-purple-600 text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                            <Zap size={10} /> Fix
                        </span>
                      </div>
                  </div>
              </div>
          </NeuroCard>
      </div>
    </div>
  );
};