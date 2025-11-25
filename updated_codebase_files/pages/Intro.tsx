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
  const targetRPM = 15;

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e0e5ec'); // Neumorphic bg
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

    const pointLight = new THREE.PointLight(0x3b82f6, 2, 100); // Blue tint
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xffffff, 1, 100);
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);

    // --- Globe Construction (Modular) ---
    const globeGroup = new THREE.Group();
    globeRef.current = globeGroup;

    // 1. Wireframe Icosahedron (Outer)
    const geometry = new THREE.IcosahedronGeometry(8, 2);
    const wireframeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4a5568, 
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });
    const sphere = new THREE.Mesh(geometry, wireframeMaterial);
    globeGroup.add(sphere);

    // 2. Nodes (Vertices)
    const positions = geometry.attributes.position.array;
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

    // 3. Inner Core
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
      
      // Add to velocity (Sensitivity)
      velocityRef.current += delta * 0.005;
      
      // Cap max velocity
      if (velocityRef.current > 0.8) velocityRef.current = 0.8;
      if (velocityRef.current < -0.8) velocityRef.current = -0.8;

      previousMouseXRef.current = clientX;
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    // --- Gyroscope Logic ---
    const handleMotion = (event: DeviceMotionEvent) => {
      if (!event.rotationRate) return;
      
      // Use rotation rate around Y axis (beta/alpha depending on orientation, mostly gamma for handheld spin)
      // Simplifying: Check overall magnitude of shake/twist
      const magnitude = Math.abs(event.rotationRate.beta || 0) + Math.abs(event.rotationRate.gamma || 0);
      
      if (magnitude > 100) { // Threshold for "shake/spin"
         velocityRef.current += 0.05; 
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
    let unlocked = false; // Local var for the loop

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (globeGroup) {
        // Apply Rotation
        globeGroup.rotation.y += velocityRef.current;
        
        // Idle animation (slow vertical tilt)
        globeGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
      }

      // Physics: Friction
      if (!isDraggingRef.current) {
        velocityRef.current *= 0.98; // Decay
      }

      // Calculate RPM
      // velocity is radians per frame. @60fps: rads/sec = vel * 60. RPM = (rads/sec / 2PI) * 60
      const currentRPM = Math.abs((velocityRef.current * 60 * 60) / (2 * Math.PI));
      setRpm(Math.round(currentRPM));

      // Check Success Condition
      if (currentRPM >= targetRPM && !unlocked) {
        unlocked = true;
        setIsUnlocked(true);
        
        // Stop accepting input
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchmove', onMouseMove);

        // Success Sequence
        triggerSuccessSequence(globeGroup, camera);
      }

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
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
    // 1. Zoom Camera In
    const zoomInterval = setInterval(() => {
        camera.position.z -= 0.5;
        if (camera.position.z <= 0) {
            clearInterval(zoomInterval);
        }
    }, 16);

    // 2. Expand/Explode Globe
    let scale = 1;
    const expandInterval = setInterval(() => {
        scale += 0.5;
        globe.scale.set(scale, scale, scale);
        globe.rotation.y += 0.2; // Fast spin
        if (scale > 20) {
            clearInterval(expandInterval);
            setShowText(true);
            setTimeout(() => {
                onComplete();
            }, 3000);
        }
    }, 16);
  };

  const requestGyro = () => {
      // iOS 13+ permission request
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          (DeviceMotionEvent as any).requestPermission()
              .then((response: string) => {
                  if (response === 'granted') {
                      setPermissionGranted(true);
                  }
              })
              .catch(console.error);
      } else {
          setPermissionGranted(true);
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#e0e5ec] overflow-hidden flex flex-col items-center justify-center">
      
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* UI Overlay */}
      <div className={`pointer-events-none relative z-10 flex flex-col items-center justify-center h-full transition-opacity duration-500 ${isUnlocked ? 'opacity-0' : 'opacity-100'}`}>
         
         <div className="mb-96 flex flex-col items-center">
             <div className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Move size={14} className="animate-pulse"/> Swipe or Shake to Spin
             </div>
             
             {/* RPM Gauge */}
             <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Neumorphic Circle */}
                <div className="absolute inset-0 rounded-full border-8 border-gray-200/50 shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)]"></div>
                
                {/* Progress Arc (Simplified as opacity for this demo) */}
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
                 <p className="text-[10px] text-center text-gray-400 mt-2">Reach {targetRPM} RPM to Initialize</p>
             </div>
         </div>

         {/* Mobile Gyro Button */}
         <div className="absolute bottom-10 pointer-events-auto">
             <button onClick={requestGyro} className="text-[10px] text-blue-500 opacity-50 hover:opacity-100 transition-opacity">
                Enable Gyroscope
             </button>
         </div>
      </div>

      {/* Success Text Animation */}
      {showText && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#e0e5ec]">
              <div className="animate-[fadeInUp_1s_ease-out_forwards]">
                  <h1 className="text-4xl md:text-6xl font-bold text-gray-700 tracking-tighter mb-2 text-center">
                      NEURO<span className="text-blue-500">VOUCHER</span>
                  </h1>
                  <div className="h-1 w-24 bg-blue-500 mx-auto rounded-full mb-6"></div>
                  <p className="text-gray-500 font-mono text-sm tracking-widest text-center animate-pulse">
                      DEVELOPED BY RIKAYU WILZAM
                  </p>
              </div>
          </div>
      )}
    </div>
  );
};
