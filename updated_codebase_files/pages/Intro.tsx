import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Move, Hand } from 'lucide-react';

interface IntroProps {
  onComplete: () => void;
}

// --- Cinematic Text Component ---
const CinematicText = ({ text, delay = 0, className = "" }: { text: string, delay?: number, className?: string }) => {
    return (
        <div className={`flex overflow-hidden ${className}`}>
            {text.split('').map((char, i) => (
                <span
                    key={i}
                    className="inline-block transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                        transitionDelay: `${delay + (i * 50)}ms`,
                        opacity: 1,
                        animation: `revealLetter 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards ${delay + (i * 50)}ms`
                    }}
                >
                    {char === ' ' ? '\u00A0' : char}
                </span>
            ))}
        </div>
    );
};

export const Intro: React.FC<IntroProps> = ({ onComplete }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [rpm, setRpm] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showText, setShowText] = useState(false);
  const [isBraking, setIsBraking] = useState(false);

  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Physics & Scene Refs
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const previousMouseXRef = useRef(0);
  const globeRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // Camera Animation State
  const cameraZRef = useRef(150); // Start FAR away (Looney Tunes style)
  const targetCameraZ = 20;       // Standard distance

  const targetRPM = 16000;

  // --- Sound Logic ---
  const initAudio = () => {
      if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
  };

  const startBrakeSound = () => {
      if (!audioCtxRef.current) initAudio();
      if (!audioCtxRef.current) return;

      // Stop existing if any
      stopBrakeSound();

      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();

      // Use sawtooth for a "friction" mechanical sound
      osc.type = 'sawtooth';
      
      // Initial frequency based on current speed
      const baseFreq = Math.max(50, Math.abs(velocityRef.current) * 100);
      osc.frequency.setValueAtTime(baseFreq, audioCtxRef.current.currentTime);

      gain.gain.setValueAtTime(0.0, audioCtxRef.current.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioCtxRef.current.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();

      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
  };

  const updateBrakeSound = () => {
      if (oscillatorRef.current && audioCtxRef.current) {
          // Modulate pitch down as velocity drops
          const freq = Math.max(40, Math.abs(velocityRef.current) * 200);
          oscillatorRef.current.frequency.setTargetAtTime(freq, audioCtxRef.current.currentTime, 0.1);
      }
  };

  const stopBrakeSound = () => {
      if (gainNodeRef.current && audioCtxRef.current) {
          const currentTime = audioCtxRef.current.currentTime;
          gainNodeRef.current.gain.cancelScheduledValues(currentTime);
          gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, currentTime);
          gainNodeRef.current.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.3);
          
          const oldOsc = oscillatorRef.current;
          setTimeout(() => {
              if (oldOsc) oldOsc.stop();
          }, 300);
      }
      oscillatorRef.current = null;
      gainNodeRef.current = null;
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e0e5ec');
    scene.fog = new THREE.Fog('#e0e5ec', 20, 160); // Adjusted fog for far distance start

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = cameraZRef.current;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x3b82f6, 2, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // --- Globe Construction ---
    const globeGroup = new THREE.Group();
    globeRef.current = globeGroup;

    const geometry = new THREE.IcosahedronGeometry(8, 2);
    const wireframeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4a5568, 
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });
    const sphere = new THREE.Mesh(geometry, wireframeMaterial);
    globeGroup.add(sphere);

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', geometry.attributes.position);
    const particlesMat = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 0.15,
      transparent: true,
      opacity: 0.6
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    globeGroup.add(particles);

    const coreGeo = new THREE.IcosahedronGeometry(6, 1);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0xe0e5ec,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.1,
      shininess: 30,
      flatShading: true
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(core);

    scene.add(globeGroup);

    // --- Interaction Logic ---
    const onMouseDown = (e: MouseEvent | TouchEvent) => {
      initAudio(); // Ensure audio context is ready
      isDraggingRef.current = true;
      previousMouseXRef.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
      
      // If simply clicking/holding without moving much yet, we consider it a "Brake" attempt
      // The mouseMove event will override this if it detects significant movement (swipe)
      setIsBraking(true);
      startBrakeSound();
    };

    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const delta = clientX - previousMouseXRef.current;
      
      // If moving significantly, it's a SWIPE, not a BRAKE
      if (Math.abs(delta) > 1) {
          setIsBraking(false); 
          stopBrakeSound(); // Stop braking sound if swiping
          
          // Sensitivity
          velocityRef.current += delta * 0.15; 
          
          // Cap
          if (velocityRef.current > 50.0) velocityRef.current = 50.0;
          if (velocityRef.current < -50.0) velocityRef.current = -50.0;
      }

      previousMouseXRef.current = clientX;
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsBraking(false);
      stopBrakeSound();
    };

    // --- Gyroscope ---
    const handleMotion = (event: DeviceMotionEvent) => {
      if (!event.rotationRate) return;
      const magnitude = Math.abs(event.rotationRate.beta || 0) + Math.abs(event.rotationRate.gamma || 0);
      if (magnitude > 100) velocityRef.current += 5.0; 
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    
    window.addEventListener('touchstart', onMouseDown);
    window.addEventListener('touchmove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);

    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', handleMotion);
    }

    // --- Animation Loop ---
    let animationId: number;
    let unlocked = false;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // 1. Camera Zoom Animation (Looney Tunes Style)
      // Exponential decay to target Z
      if (Math.abs(cameraZRef.current - targetCameraZ) > 0.1) {
          // Adjust 0.05 for speed of zoom
          cameraZRef.current += (targetCameraZ - cameraZRef.current) * 0.08; 
          camera.position.z = cameraZRef.current;
      }

      // 2. Globe Rotation
      if (globeGroup) {
        globeGroup.rotation.y += velocityRef.current;
        globeGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
      }

      // 3. Physics & Braking
      if (isBraking) {
          // Strong Friction when holding
          velocityRef.current *= 0.85; 
          updateBrakeSound();
      } else if (!isDraggingRef.current) {
          // Low Friction when free spinning
          velocityRef.current *= 0.99; 
      }

      // 4. RPM Logic
      const currentRPM = Math.abs((velocityRef.current * 60 * 60) / (2 * Math.PI));
      setRpm(Math.round(currentRPM));

      if (currentRPM >= targetRPM && !unlocked) {
        unlocked = true;
        setIsUnlocked(true);
        setIsBraking(false);
        stopBrakeSound();
        
        // Remove listeners
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchmove', onMouseMove);

        triggerSuccessSequence(globeGroup, camera);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      stopBrakeSound();
      if (audioCtxRef.current) audioCtxRef.current.close();
      
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchstart', onMouseDown);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
      window.removeEventListener('devicemotion', handleMotion);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const triggerSuccessSequence = (globe: THREE.Group, camera: THREE.Camera) => {
    // 1. Zoom Camera (Final Punch)
    const zoomInterval = setInterval(() => {
        camera.position.z -= 0.5;
        if (camera.position.z <= 0) {
            clearInterval(zoomInterval);
        }
    }, 16);

    // 2. Explode/Scale Globe
    let scale = 1;
    const expandInterval = setInterval(() => {
        scale += 0.5;
        globe.scale.set(scale, scale, scale);
        globe.rotation.y += 0.2; 
        if (scale > 30) {
            clearInterval(expandInterval);
            setShowText(true);
            // Longer wait for Cinematic text reading
            setTimeout(() => {
                onComplete();
            }, 5500); 
        }
    }, 16);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#e0e5ec] overflow-hidden flex flex-col items-center justify-center">
      {/* 
          Standard Style Block for Keyframes since we are inside a component.
          In a larger app, this would be in global CSS.
      */}
      <style>{`
        @keyframes revealLetter {
            0% {
                opacity: 0;
                transform: translateY(20px) scale(0.8);
                filter: blur(10px);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
                filter: blur(0);
            }
        }
        @keyframes typewriter {
            from { width: 0; }
            to { width: 100%; }
        }
      `}</style>

      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* RPM Gauge UI */}
      <div className={`pointer-events-none relative z-10 flex flex-col items-center justify-center h-full transition-all duration-700 ${isUnlocked ? 'opacity-0 scale-150 blur-md' : 'opacity-100 scale-100 blur-0'}`}>
         <div className="mb-96 flex flex-col items-center">
             <div className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                <Move size={14} className="animate-pulse"/> Swipe to Spin 
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <Hand size={14} /> Hold to Brake
             </div>
             
             <div className={`relative w-48 h-48 flex items-center justify-center transition-transform duration-100 ${isBraking ? 'scale-95' : 'scale-100'}`}>
                <div className="absolute inset-0 rounded-full border-8 border-gray-200/50 shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]"></div>
                
                <div className={`absolute inset-0 rounded-full border-8 transition-all duration-100 ${isBraking ? 'border-red-500 opacity-100' : 'border-blue-500 opacity-80'}`}
                     style={{ 
                         clipPath: `inset(${100 - Math.min(100, (rpm / targetRPM) * 100)}% 0 0 0)`,
                     }}
                ></div>

                <div className="text-center">
                    <span className={`text-4xl font-black font-mono tracking-tighter transition-colors ${rpm >= targetRPM ? 'text-green-500' : isBraking ? 'text-red-500' : 'text-gray-600'}`}>
                        {rpm.toLocaleString()}
                    </span>
                    <div className="text-[10px] text-gray-400 font-bold mt-1">RPM</div>
                </div>
             </div>

             <div className="mt-8">
                 <div className="h-1 w-32 bg-gray-300 rounded-full overflow-hidden">
                     <div className={`h-full transition-all duration-100 ease-out ${isBraking ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (rpm / targetRPM) * 100)}%` }}></div>
                 </div>
                 <p className="text-[10px] text-center text-gray-400 mt-2">Target: {targetRPM.toLocaleString()} RPM</p>
             </div>
         </div>
      </div>

      {/* AAA Cinematic Text Sequence */}
      {showText && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-center transform translate-y-[-20px]">
                  
                  {/* Title */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-6">
                      <CinematicText 
                          text="NEURO" 
                          delay={200} 
                          className="text-5xl md:text-8xl font-black text-gray-700 tracking-tighter drop-shadow-xl" 
                      />
                      <CinematicText 
                          text="VOUCHER" 
                          delay={800} 
                          className="text-5xl md:text-8xl font-black text-blue-500 tracking-tighter drop-shadow-blue-xl" 
                      />
                  </div>

                  {/* Decorative Line */}
                  <div className="h-1.5 w-0 bg-gradient-to-r from-blue-400 to-purple-600 mx-auto rounded-full mb-8 shadow-lg shadow-blue-200"
                       style={{ animation: 'typewriter 1s cubic-bezier(0.22, 1, 0.36, 1) forwards 1.5s' }}
                  ></div>

                  {/* Subtitle - Typewriter Effect */}
                  <div className="overflow-hidden inline-block border-r-2 border-blue-500 pr-1"
                       style={{ 
                           whiteSpace: 'nowrap',
                           width: '0',
                           animation: 'typewriter 2s steps(30) forwards 2s, blink 1s infinite'
                       }}>
                      <p className="text-gray-500 font-mono text-sm md:text-base tracking-[0.4em] uppercase font-semibold">
                          Developed by Rikayu Wilzam
                      </p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};