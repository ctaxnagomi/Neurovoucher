import React from 'react';
import { NeuroCard, NeuroBadge } from '../components/NeuroComponents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', amt: 2400 },
  { name: 'Tue', amt: 1398 },
  { name: 'Wed', amt: 9800 },
  { name: 'Thu', amt: 3908 },
  { name: 'Fri', amt: 4800 },
  { name: 'Sat', amt: 3800 },
  { name: 'Sun', amt: 4300 },
];

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeuroCard>
          <div className="text-gray-500 text-sm font-medium">Total Expenses</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">RM 45,231.00</div>
          <div className="mt-4 flex gap-2">
             <NeuroBadge color="text-green-600">+12%</NeuroBadge>
             <span className="text-xs text-gray-400 flex items-center">vs last month</span>
          </div>
        </NeuroCard>
        <NeuroCard>
          <div className="text-gray-500 text-sm font-medium">Pending Vouchers</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">14</div>
           <div className="mt-4 flex gap-2">
             <NeuroBadge color="text-orange-600">Action Required</NeuroBadge>
          </div>
        </NeuroCard>
        <NeuroCard>
          <div className="text-gray-500 text-sm font-medium">AI Optimizations</div>
          <div className="text-3xl font-bold text-gray-700 mt-2">89</div>
           <div className="mt-4 flex gap-2">
             <NeuroBadge color="text-purple-600">Gemini 3.0</NeuroBadge>
          </div>
        </NeuroCard>
      </div>

      <NeuroCard title="Weekly Expenditure" className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#718096'}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#718096'}} />
            <Tooltip 
                cursor={{fill: '#cbd5e0', opacity: 0.2}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '9px 9px 16px rgba(163,177,198,0.6)', backgroundColor: '#e0e5ec', color: '#4a5568' }}
            />
            <Bar dataKey="amt" fill="#63b3ed" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </NeuroCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NeuroCard title="Recent Activity">
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
          </NeuroCard>
          <NeuroCard title="AI Insights">
              <div className="space-y-4">
                  <div className="bg-blue-100/50 p-4 rounded-xl text-sm text-blue-800 border border-blue-200/50">
                      <strong>Gemini Flash Lite:</strong> You have 3 duplicate receipts from "Speedmart 99". Consider consolidating.
                  </div>
                  <div className="bg-purple-100/50 p-4 rounded-xl text-sm text-purple-800 border border-purple-200/50">
                      <strong>Gemini 3 Pro:</strong> Your travel expenses are 15% higher than the monthly average.
                  </div>
              </div>
          </NeuroCard>
      </div>
    </div>
  );
};
