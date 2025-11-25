import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { NeuroCard } from '../components/NeuroComponents';
import { Activity, Move, Zap } from 'lucide-react';

interface IntroProps {
  onComplete: () => void;
}

export const Intro: React.FC<IntroProps> = ({ onComplete }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [rpm, setRpm] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showText, setShowText] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Physics state
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const previousMouseXRef = useRef(0);
  const globeRef = useRef<THREE.Group | null>(null);
  
  // Updated Target RPM to 16000
  const targetRPM = 16000;

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e0e5ec');
    scene.fog = new THREE.Fog('#e0e5ec', 10, 50);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

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

    const pointLight2 = new THREE.PointLight(0xffffff, 1, 100);
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);

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
      isDraggingRef.current = true;
      previousMouseXRef.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
    };

    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const delta = clientX - previousMouseXRef.current;
      
      // Hyper-sensitivity for 16000 RPM target
      velocityRef.current += delta * 0.15; 
      
      // Extreme velocity cap (approx 30-40 rad/frame needed for 16k RPM)
      if (velocityRef.current > 50.0) velocityRef.current = 50.0;
      if (velocityRef.current < -50.0) velocityRef.current = -50.0;

      previousMouseXRef.current = clientX;
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    // --- Gyroscope Logic ---
    const handleMotion = (event: DeviceMotionEvent) => {
      if (!event.rotationRate) return;
      const magnitude = Math.abs(event.rotationRate.beta || 0) + Math.abs(event.rotationRate.gamma || 0);
      
      if (magnitude > 100) { 
         // Stronger impulse for shake to reach high RPM
         velocityRef.current += 5.0; 
      }
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

      if (globeGroup) {
        globeGroup.rotation.y += velocityRef.current;
        globeGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
      }

      if (!isDraggingRef.current) {
        // Low friction to allow extreme spin up
        velocityRef.current *= 0.99; 
      }

      const currentRPM = Math.abs((velocityRef.current * 60 * 60) / (2 * Math.PI));
      setRpm(Math.round(currentRPM));

      if (currentRPM >= targetRPM && !unlocked) {
        unlocked = true;
        setIsUnlocked(true);
        
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
    // 1. Zoom Camera
    const zoomInterval = setInterval(() => {
        camera.position.z -= 0.5;
        if (camera.position.z <= 0) {
            clearInterval(zoomInterval);
        }
    }, 16);

    // 2. Explode Globe
    let scale = 1;
    const expandInterval = setInterval(() => {
        scale += 0.5;
        globe.scale.set(scale, scale, scale);
        globe.rotation.y += 0.2; 
        if (scale > 30) {
            clearInterval(expandInterval);
            setShowText(true);
            // Longer timeout to read the text
            setTimeout(() => {
                onComplete();
            }, 4500); 
        }
    }, 16);
  };

  const requestGyro = () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          (DeviceMotionEvent as any).requestPermission()
              .then((response: string) => {
                  if (response === 'granted') setPermissionGranted(true);
              })
              .catch(console.error);
      } else {
          setPermissionGranted(true);
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#e0e5ec] overflow-hidden flex flex-col items-center justify-center">
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* RPM Gauge UI */}
      <div className={`pointer-events-none relative z-10 flex flex-col items-center justify-center h-full transition-opacity duration-500 ${isUnlocked ? 'opacity-0' : 'opacity-100'}`}>
         <div className="mb-96 flex flex-col items-center">
             <div className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Move size={14} className="animate-pulse"/> Swipe or Shake to Spin
             </div>
             
             <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-8 border-gray-200/50 shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]"></div>
                
                <div className="absolute inset-0 rounded-full border-8 border-blue-500 transition-all duration-100"
                     style={{ 
                         clipPath: `inset(${100 - Math.min(100, (rpm / targetRPM) * 100)}% 0 0 0)`,
                         opacity: 0.8
                     }}
                ></div>

                <div className="text-center">
                    <span className={`text-4xl font-black font-mono tracking-tighter transition-colors ${rpm >= targetRPM ? 'text-green-500' : 'text-gray-600'}`}>
                        {rpm}
                    </span>
                    <div className="text-[10px] text-gray-400 font-bold mt-1">RPM</div>
                </div>
             </div>

             <div className="mt-8">
                 <div className="h-1 w-32 bg-gray-300 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-500 transition-all duration-100 ease-out" style={{ width: `${Math.min(100, (rpm / targetRPM) * 100)}%` }}></div>
                 </div>
                 <p className="text-[10px] text-center text-gray-400 mt-2">Target: {targetRPM} RPM</p>
             </div>
         </div>

         <div className="absolute bottom-10 pointer-events-auto">
             <button onClick={requestGyro} className="text-[10px] text-blue-500 opacity-50 hover:opacity-100 transition-opacity">
                Enable Gyroscope
             </button>
         </div>
      </div>

      {/* Success Text - Slow Fade In */}
      <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none transition-all duration-[2000ms] ease-out ${showText ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-700 tracking-tighter mb-4">
                  NEURO<span className="text-blue-500">VOUCHER</span>
              </h1>
              <div className="h-1 w-24 bg-blue-500 mx-auto rounded-full mb-8 shadow-lg shadow-blue-200"></div>
              <p className="text-gray-500 font-mono text-sm tracking-[0.3em] uppercase animate-pulse">
                  Developed by Rikayu Wilzam
              </p>
          </div>
      </div>
    </div>
  );
};