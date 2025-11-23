import React from 'react';

// Neumorphic Shadow Utilities
const shadowOuter = "shadow-[9px_9px_16px_rgba(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]";
const shadowInner = "shadow-[inset_6px_6px_10px_rgba(163,177,198,0.6),inset_-6px_-6px_10px_rgba(255,255,255,0.5)]";
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
  const activeClass = active ? shadowInner : `${shadowOuter} hover:translate-y-[-2px] active:translate-y-[1px] transition-all`;
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
    className={`${bgBase} ${textPrimary} w-full py-3 px-4 rounded-xl ${shadowInner} outline-none focus:ring-2 focus:ring-blue-400/30 transition-all placeholder-gray-400 ${props.className}`}
    {...props}
  />
);

export const NeuroSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <div className="relative">
    <select 
      className={`${bgBase} ${textPrimary} w-full py-3 px-4 rounded-xl ${shadowInner} outline-none focus:ring-2 focus:ring-blue-400/30 transition-all appearance-none cursor-pointer ${props.className}`}
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
    className={`${bgBase} ${textPrimary} w-full py-3 px-4 rounded-xl ${shadowInner} outline-none focus:ring-2 focus:ring-blue-400/30 transition-all placeholder-gray-400 ${props.className}`}
    {...props}
  />
);

export const NeuroBadge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "text-blue-500" }) => (
    <span className={`${bgBase} ${shadowOuter} px-3 py-1 rounded-full text-xs font-bold ${color}`}>
        {children}
    </span>
);