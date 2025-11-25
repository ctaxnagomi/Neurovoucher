import React from 'react';

// Neumorphic Shadow Utilities
const shadowOuter = "shadow-[9px_9px_16px_rgba(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]";
// User-provided specific input style
const inputStyle = "bg-[#e0e5ec] text-gray-700 w-full py-3 px-4 rounded-xl shadow-[inset_6px_6px_10px_rgba(163,177,198,0.6),inset_-6px_-6px_10px_rgba(255,255,255,0.5)] outline-none focus:ring-2 focus:ring-blue-400/30 transition-all placeholder-gray-400";

const bgBase = "bg-[#e0e5ec]";
const textPrimary = "text-gray-700";

export const NeuroCard: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ 
  children, className = "", title 
}) => (
  <div className={`${bgBase} rounded-2xl p-6 ${shadowOuter} ${className}`}>
    {title && <h3 className="text-lg font-bold mb-4 text-gray-600 uppercase tracking-wider">{title}</h3>}
    {children}
  </div>
);

export const NeuroButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }> = ({ 
  children, className = "", active = false, ...props 
}) => {
  const activeClass = active 
    ? "shadow-[inset_6px_6px_10px_rgba(163,177,198,0.6),inset_-6px_-6px_10px_rgba(255,255,255,0.5)]" 
    : `${shadowOuter} hover:translate-y-[-2px] active:translate-y-[1px] transition-all`;
    
  return (
    <button 
      className={`${bgBase} ${textPrimary} font-semibold py-3 px-6 rounded-xl ${activeClass} active:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const NeuroInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    className={`${inputStyle} ${props.className || ''}`}
    {...props}
  />
);

export const NeuroSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <div className="relative w-full">
    <select 
      className={`${inputStyle} appearance-none cursor-pointer ${props.className || ''}`}
      {...props}
    >
        {props.children}
    </select>
    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </div>
  </div>
);

export const NeuroTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea 
    className={`${inputStyle} ${props.className || ''}`}
    {...props}
  />
);

export const NeuroBadge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "text-blue-500" }) => (
    <span className={`${bgBase} ${shadowOuter} px-3 py-1 rounded-full text-xs font-bold ${color}`}>
        {children}
    </span>
);

export const NeuroToggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label: string; className?: string }> = ({ checked, onChange, label, className = "" }) => (
    <div 
        onClick={() => onChange(!checked)}
        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] select-none bg-[#e0e5ec] shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)] border border-white/20 ${className}`}
    >
        <span className={`text-sm font-bold ml-1 transition-colors ${checked ? 'text-green-600' : 'text-gray-500'}`}>{label}</span>
        <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${checked ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-gray-300 shadow-inner'}`}>
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </div>
    </div>
);