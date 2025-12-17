import React from 'react';

// Shadcn-like Utilities
const shadowOuter = "shadow-sm border border-slate-200";
const bgBase = "bg-white";
const textPrimary = "text-slate-900";

// Input Style
const inputStyle = "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const TunaiCard: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ 
  children, className = "", title 
}) => (
  <div className={`glass-card rounded-xl p-6 text-card-foreground border-0 ${className}`}>
    {title && <h3 className="text-lg font-semibold leading-none tracking-tight mb-4 text-slate-800">{title}</h3>}
    {children}
  </div>
);

export const TunaiButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }> = ({ 
  children, className = "", active = false, ...props 
}) => {
  const activeClass = active 
    ? "bg-slate-100 text-slate-900" 
    : "bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900";
    
  return (
    <button 
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 h-10 px-4 py-2 ${activeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const TunaiInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    className={`glass-input flex h-10 w-full rounded-md px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`}
    {...props}
  />
);

export const TunaiSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <div className="relative w-full">
    <select 
      className={`${inputStyle} appearance-none cursor-pointer ${props.className || ''}`}
      {...props}
    >
        {props.children}
    </select>
    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </div>
  </div>
);

export const TunaiTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea 
    className={`${inputStyle} min-h-[80px] py-3 ${props.className || ''}`}
    {...props}
  />
);

export const TunaiBadge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "text-blue-500" }) => {
    // Extract base color name if possible or default to slate
    const baseClass = "inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2";
    return (
      <span className={`${baseClass} bg-slate-50 ${color}`}>
          {children}
      </span>
    );
};

export const TunaiToggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label: string; className?: string }> = ({ checked, onChange, label, className = "" }) => (
    <div 
        onClick={() => onChange(!checked)}
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all active:scale-[0.98] select-none border border-slate-200 bg-white hover:bg-slate-50 ${className}`}
    >
        <span className={`text-sm font-medium ml-1 transition-colors ${checked ? 'text-green-600' : 'text-slate-700'}`}>{label}</span>
        <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${checked ? 'bg-green-500' : 'bg-slate-200'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
    </div>
);