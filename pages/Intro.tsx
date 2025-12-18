// [REF-001] Refactored Sequence & Animation
// Credit : Wan Mohd Azizi (Rikayu Wilzam)

import React, { useEffect, useState } from 'react';
import logo from '../assets/tunaicukaimy-logo/tunaicukaimylogo-2trans.png';

interface IntroProps {
  onComplete: () => void;
}

export const Intro = ({ onComplete }: IntroProps) => {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    // Sequence Timings
    const s1 = setTimeout(() => setSlide(1), 2500); // Hilang Resit?
    const s2 = setTimeout(() => setSlide(2), 5500); // Bisnes...
    const s3 = setTimeout(() => setSlide(3), 11500); // Gunakan TunaiCukaiMY... (Long text needs time)
    const end = setTimeout(() => {
      onComplete();
    }, 15500); // Final

    return () => {
      clearTimeout(s1);
      clearTimeout(s2);
      clearTimeout(s3);
      clearTimeout(end);
    };
  }, [onComplete]);

  return (

    <div className="fixed inset-0 z-50 overflow-hidden font-sans text-white flex items-center justify-center p-8 bg-transparent">
      
      {/* Background Layer (Fixed Z-0) */}
      <div className="absolute inset-0 z-0">
          <img src="/bg-mountains.jpg" alt="Intro Background" className="w-full h-full object-cover" />
      </div>

      {/* Blur Overlay Layer (Fixed Z-10) */}
      <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px]"></div>

      {/* Content Layer (Relative Z-20) */}
      <div className="relative z-20 flex flex-col items-center justify-center w-full max-w-6xl">
      
      {/* Slide 0: Hilang Resit? */}
      {slide === 0 && (
        <div className="animate-wipe-in text-center">
           <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-pink-500 drop-shadow-lg">
             Hilang Resit?
           </h1>
        </div>
      )}

      {/* Slide 1: Bisnes Cash? */}
      {slide === 1 && (
        <div className="animate-wipe-in text-center max-w-4xl">
           <h1 className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-lg">
             Bisnes menggunakan <span className="text-yellow-400">wang tunai</span> sahaja?
           </h1>
        </div>
      )}

      {/* Slide 2: Explanation */}
      {slide === 2 && (
        <div className="animate-wipe-in text-center max-w-5xl">
           <p className="text-2xl md:text-4xl font-light leading-relaxed text-slate-100 drop-shadow-md">
             Gunakan <strong className="text-blue-400 font-bold">TunaiCukaiMY</strong> dimana dengan mudah anda sebagai penguna dapat menyelesaikan pemfailan transaksi yang menggunakan wang tunai dan menyelesaikan masalah resit menggunakan <span className="underline decoration-blue-500 decoration-4">Bank statement anda</span>.
           </p>
        </div>
      )}

      {/* Slide 3: Final Branding */}
      {slide === 3 && (
        <div className="animate-wipe-in flex flex-col items-center">
            <img src={logo} alt="TunaiCukai Logo" className="w-32 h-32 md:w-48 md:h-48 object-contain mb-6 drop-shadow-2xl" />
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-white drop-shadow-xl">
                TunaiCukai<span className="text-blue-500">MY</span>
            </h1>
            <div className="h-1 w-32 bg-blue-600 rounded-full mb-6 shadow-lg"></div>
            <p className="text-xl md:text-2xl uppercase tracking-[0.3em] font-medium text-slate-300 drop-shadow-md mb-8">
                Cara Mudah Cara Kita
            </p>
            {/* Stripe Climate Badge */}
            <iframe 
                width="380" 
                height="38" 
                style={{ border: 0 }} 
                src="https://climate.stripe.com/badge/NmIHrx?theme=dark&size=small&locale=en-US"
                title="Stripe Climate Badge"
            ></iframe>
        </div>
      )}
      
      </div>

      {/* Persistent Footer (Z-30) */}
      <div className="absolute bottom-8 left-0 right-0 text-center flex flex-col items-center gap-2 opacity-80 z-30">
        <div className="flex gap-2 justify-center mb-2">
            {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-500 ${slide === i ? 'w-8 bg-blue-500' : 'w-2 bg-slate-400/50'}`}></div>
            ))}
        </div>
        <p className="text-slate-300 text-[10px] tracking-widest uppercase shadow-black drop-shadow-md font-semibold">
            Credit : Wan Mohd Azizi (Rikayu Wilzam)
        </p>
      </div>

       {/* Photographer Credit (Bottom Right Z-30) */}
       <a 
         href="https://unsplash.com/photos/a-group-of-mountains-with-trees-in-the-foreground-zs7WhsjVfRA?utm_source=unsplash&utm_medium=referral&utm_content=creditShareLink"
         target="_blank" 
         rel="noopener noreferrer"
         className="absolute bottom-2 right-2 z-30 text-[9px] text-white/50 hover:text-white transition-opacity font-light tracking-wide uppercase drop-shadow-sm"
       >
          Photo by Aliff Haikal
       </a>
    </div>
  );
};
