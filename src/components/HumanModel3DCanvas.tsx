'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Layers,
  Sparkles,
  Move3d,
  Compass,
  Scan,
} from 'lucide-react';
import { OrganType } from './AnatomicalVisualizer';

interface HumanModel3DCanvasProps {
  selectedOrgan: OrganType;
  onSelectOrgan: (organ: OrganType) => void;
  isDarkMode: boolean;
}

// Normalized 3D anchor points on centered human body (Height normalized ~ 1.0, Y from -0.5 to +0.5)
const ORGAN_3D_POSITIONS: Record<
  OrganType,
  {
    pos: [number, number, number];
    normal: [number, number, number];
    label: string;
    badge: string;
  }
> = {
  heart: {
    pos: [0.035, 0.20, 0.07],
    normal: [0.2, 0.1, 0.95],
    label: 'Heart',
    badge: '110 BPM (Live)',
  },
  brain: {
    pos: [0.0, 0.44, 0.03],
    normal: [0.0, 0.3, 0.95],
    label: 'Brain',
    badge: 'Normotonic 4/5',
  },
  stomach: {
    pos: [-0.03, 0.07, 0.07],
    normal: [-0.1, 0.0, 0.95],
    label: 'Stomach',
    badge: 'Gastritis / NO NSAIDs',
  },
  lungs: {
    pos: [-0.045, 0.22, 0.07],
    normal: [-0.2, 0.1, 0.95],
    label: 'Lungs',
    badge: '98% SpO2 Clear',
  },
  eyes: {
    pos: [0.0, 0.40, 0.075],
    normal: [0.0, 0.1, 0.95],
    label: 'Vision',
    badge: 'Bifocals Req',
  },
  mobility: {
    pos: [0.07, -0.22, 0.06],
    normal: [0.2, 0.0, 0.95],
    label: 'Knee Joint',
    badge: 'Walker Assist',
  },
  skin: {
    pos: [0.13, 0.13, 0.05],
    normal: [0.8, 0.1, 0.4],
    label: 'Dermis',
    badge: 'Braden 19 Intact',
  },
};

export function HumanModel3DCanvas({
  selectedOrgan,
  onSelectOrgan,
  isDarkMode,
}: HumanModel3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js instances ref
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

  // Interactive UI state
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Rotation mode:
  // 'sway' = subtle organic ±4° medical hologram breathing sway (always faces user)
  // 'turntable' = continuous 360° medical showcase rotation
  // 'static' = locked front/back orientation
  const [rotationMode, setRotationMode] = useState<'sway' | 'turntable' | 'static'>('sway');
  const rotationModeRef = useRef<'sway' | 'turntable' | 'static'>('sway');

  const [viewAngle, setViewAngle] = useState<'anterior' | 'posterior'>('anterior');
  const viewAngleRef = useRef<'anterior' | 'posterior'>('anterior');

  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [hoveredHotspot, setHoveredHotspot] = useState<OrganType | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  useEffect(() => {
    rotationModeRef.current = rotationMode;
  }, [rotationMode]);

  useEffect(() => {
    viewAngleRef.current = viewAngle;
  }, [viewAngle]);

  // Synchronize dark mode changes without tearing down WebGL or reloading 3D model
  useEffect(() => {
    if (ambientLightRef.current) {
      ambientLightRef.current.intensity = isDarkMode ? 1.6 : 2.0;
    }
    if (ringMatRef.current) {
      ringMatRef.current.color.setHex(isDarkMode ? 0x38bdf8 : 0x7c3aed);
      ringMatRef.current.opacity = isDarkMode ? 0.35 : 0.2;
    }
  }, [isDarkMode]);

  // Screen coordinates for 3D organ beacon overlays
  const [beaconCoords, setBeaconCoords] = useState<
    Record<
      OrganType,
      { x: number; y: number; isFacing: boolean; visible: boolean }
    >
  >({
    heart: { x: 0, y: 0, isFacing: true, visible: false },
    brain: { x: 0, y: 0, isFacing: true, visible: false },
    stomach: { x: 0, y: 0, isFacing: true, visible: false },
    lungs: { x: 0, y: 0, isFacing: true, visible: false },
    eyes: { x: 0, y: 0, isFacing: true, visible: false },
    mobility: { x: 0, y: 0, isFacing: true, visible: false },
    skin: { x: 0, y: 0, isFacing: true, visible: false },
  });

  // Camera animation target
  const targetCameraPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);

  // Trigger high-tech scan beam when organ changes
  useEffect(() => {
    setIsScanning(true);
    const timer = setTimeout(() => setIsScanning(false), 1200);
    return () => clearTimeout(timer);
  }, [selectedOrgan]);

  // Smoothly focus camera when organ is selected without cropping the body
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const organData = ORGAN_3D_POSITIONS[selectedOrgan];
    if (organData) {
      const organPos = new THREE.Vector3(...organData.pos);
      targetLookAtRef.current = new THREE.Vector3(organPos.x * 0.3, organPos.y * 0.7 + 0.06, 0);
      targetCameraPosRef.current = new THREE.Vector3(
        organPos.x * 0.2,
        organPos.y * 0.4 + 0.06,
        1.85 // Keep generous framing so the entire torso and head remain visible!
      );
    }
  }, [selectedOrgan]);

  // Main Three.js Scene Setup & Mount
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera with optimal anatomical portrait perspective
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 20);
    camera.position.set(0, 0.06, 1.90);
    cameraRef.current = camera;

    // 3. High quality WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.1;
    controls.maxDistance = 2.8;
    controls.maxPolarAngle = Math.PI * 0.82;
    controls.minPolarAngle = Math.PI * 0.18;
    controls.target.set(0, 0.06, 0);
    controlsRef.current = controls;

    // Pause auto-rotation mode on user manual interaction without re-mounting
    controls.addEventListener('start', () => {
      rotationModeRef.current = 'static';
      setRotationMode('static');
    });

    // 5. Lighting Setup (Medical Hologram & Ambient Illumination)
    const ambientLight = new THREE.AmbientLight(0xffffff, isDarkMode ? 1.6 : 2.0);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Key front light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(1.5, 2.5, 3);
    scene.add(keyLight);

    // Cyan holographic rim light
    const cyanRimLight = new THREE.DirectionalLight(0x38bdf8, 2.6);
    cyanRimLight.position.set(-3, 1.5, 1);
    scene.add(cyanRimLight);

    // Purple / violet specular rim light
    const purpleAccentLight = new THREE.DirectionalLight(0xa855f7, 2.2);
    purpleAccentLight.position.set(2, -1, 2);
    scene.add(purpleAccentLight);

    // Soft backlight
    const backFillLight = new THREE.DirectionalLight(0x60a5fa, 1.4);
    backFillLight.position.set(0, 2, -3);
    scene.add(backFillLight);

    // Ground holographic circular base ring
    const ringGeo = new THREE.RingGeometry(0.26, 0.42, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isDarkMode ? 0x38bdf8 : 0x7c3aed,
      transparent: true,
      opacity: isDarkMode ? 0.35 : 0.2,
      side: THREE.DoubleSide,
    });
    ringMatRef.current = ringMat;
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = -0.48;
    scene.add(ringMesh);

    // Inner glowing pulse disk
    const innerDiskGeo = new THREE.CircleGeometry(0.24, 32);
    const innerDiskMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const innerDisk = new THREE.Mesh(innerDiskGeo, innerDiskMat);
    innerDisk.rotation.x = Math.PI / 2;
    innerDisk.position.y = -0.48;
    scene.add(innerDisk);

    // 6. Model Group Container
    const modelGroup = new THREE.Group();
    // Default rotation is 0 (facing front/anterior directly)
    modelGroup.rotation.y = 0;
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // 7. Load GLB Model
    const loader = new GLTFLoader();
    setIsLoading(true);
    setLoadError(null);

    loader.load(
      '/models/human-model.glb',
      (gltf) => {
        const object = gltf.scene;

        // Compute Bounding Box to perfectly center & elevate
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());

        // Position model centered on X & Z, and elevated by +0.06 on Y
        // so the upper body & organs sit comfortably above bottom HUD cards!
        object.position.x = -center.x;
        object.position.y = -center.y + 0.06;
        object.position.z = -center.z;

        // Enhance materials with glossy medical hologram finish
        object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.roughness = 0.32;
              mat.metalness = 0.18;
              mat.transparent = true;
              mat.opacity = 0.96;
              mat.needsUpdate = true;
            }
          }
        });

        modelGroup.add(object);
        setIsLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          const percent = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
          setLoadingProgress(percent);
        } else {
          setLoadingProgress((prev) => Math.min(95, prev + 12));
        }
      },
      (error) => {
        console.error('Error loading human-model.glb:', error);
        setLoadError('Failed to load 3D anatomical model');
        setIsLoading(false);
      }
    );

    // 8. Render & Animation Loop
    let lastTime = performance.now();

    const animate = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Smooth camera interpolation
      if (targetCameraPosRef.current && targetLookAtRef.current) {
        camera.position.lerp(targetCameraPosRef.current, 0.06);
        controls.target.lerp(targetLookAtRef.current, 0.06);

        if (
          camera.position.distanceTo(targetCameraPosRef.current) < 0.02 &&
          controls.target.distanceTo(targetLookAtRef.current) < 0.02
        ) {
          targetCameraPosRef.current = null;
          targetLookAtRef.current = null;
        }
      }

      // 3D Motion Modes:
      if (modelGroupRef.current) {
        const currentMode = rotationModeRef.current;
        const currentAngle = viewAngleRef.current;
        const targetBaseAngle = currentAngle === 'anterior' ? 0 : Math.PI;

        if (currentMode === 'turntable') {
          // Smooth continuous 360° turntable
          modelGroupRef.current.rotation.y += delta * 0.45;
        } else if (currentMode === 'sway') {
          // Organic breathing sway (±4.5°) — Always keeps front/chosen view facing user!
          const swayOffset = Math.sin(now * 0.0012) * 0.08;
          // Smoothly interpolate towards base angle + sway
          modelGroupRef.current.rotation.y = THREE.MathUtils.lerp(
            modelGroupRef.current.rotation.y,
            targetBaseAngle + swayOffset,
            0.05
          );
        } else {
          // Static locked orientation
          modelGroupRef.current.rotation.y = THREE.MathUtils.lerp(
            modelGroupRef.current.rotation.y,
            targetBaseAngle,
            0.08
          );
        }
      }

      controls.update();

      // Project 3D Organ Anchor Points to 2D Screen Overlay
      if (containerRef.current && modelGroupRef.current && cameraRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const modelMatrix = modelGroupRef.current.matrixWorld;
        const cam = cameraRef.current;
        const camDir = new THREE.Vector3();
        cam.getWorldDirection(camDir);

        const newCoords: any = {};

        (Object.keys(ORGAN_3D_POSITIONS) as OrganType[]).forEach((organKey) => {
          const data = ORGAN_3D_POSITIONS[organKey];
          // Transform local anchor point to world space
          const worldPos = new THREE.Vector3(...data.pos).applyMatrix4(modelMatrix);

          // Project world position to NDC (-1 to +1)
          const ndcPos = worldPos.clone().project(cam);

          // Calculate surface normal direction in world space
          const normalWorld = new THREE.Vector3(...data.normal)
            .transformDirection(modelMatrix)
            .normalize();

          // Check if facing camera
          const isFacing = normalWorld.dot(camDir) < 0.45;

          // Convert NDC to screen pixel coords
          const screenX = ((ndcPos.x + 1) / 2) * rect.width;
          const screenY = ((-ndcPos.y + 1) / 2) * rect.height;
          const isVisible = ndcPos.z > -1 && ndcPos.z < 1;

          newCoords[organKey] = {
            x: screenX,
            y: screenY,
            isFacing,
            visible: isVisible,
          };
        });

        setBeaconCoords(newCoords);
      }

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Wireframe toggle effect
  useEffect(() => {
    if (!modelGroupRef.current) return;
    modelGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.wireframe = isWireframe;
          mat.needsUpdate = true;
        }
      }
    });
  }, [isWireframe]);

  // View Controls
  const handleResetCamera = useCallback(() => {
    if (!controlsRef.current || !cameraRef.current || !modelGroupRef.current) return;
    targetLookAtRef.current = new THREE.Vector3(0, 0.06, 0);
    targetCameraPosRef.current = new THREE.Vector3(0, 0.06, 1.90);
    setViewAngle('anterior');
    setRotationMode('sway');
  }, []);

  const handleToggleTurntable = useCallback(() => {
    setRotationMode((prev) => (prev === 'turntable' ? 'sway' : 'turntable'));
  }, []);

  const handleFlipView = useCallback(() => {
    setViewAngle((prev) => (prev === 'anterior' ? 'posterior' : 'anterior'));
  }, []);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const factor = direction === 'in' ? 0.85 : 1.20;
    camera.position.multiplyScalar(factor);
    controlsRef.current.update();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[460px] flex items-center justify-center overflow-hidden rounded-3xl select-none"
    >
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Holographic Medical Grid Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf818_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-80" />

      {/* Animated Medical Hologram Scanline Sweeper */}
      {isScanning && (
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent blur-xs pointer-events-none animate-bounce" />
      )}

      {/* Loading Progress Bar */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/80 dark:bg-[#12151E]/90 backdrop-blur-md p-6">
          <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 via-purple-600 to-cyan-500 p-0.5 shadow-xl animate-pulse flex items-center justify-center mb-4">
            <div className="w-full h-full rounded-[22px] bg-white dark:bg-[#141722] flex items-center justify-center">
              <Move3d className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
            </div>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Rendering Holographic Anatomy
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            human-model.glb ({loadingProgress}%)
          </p>

          <div className="w-48 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, loadingProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Notice */}
      {loadError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-white/90 dark:bg-[#12151E]/90">
          <span className="text-rose-500 font-bold text-xs">{loadError}</span>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-3 py-1 rounded-xl bg-purple-600 text-white text-xs font-semibold cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3D PROJECTED ORGAN HOTSPOTS (Anchored to true 3D Coordinates) */}
      {/* ========================================================================= */}
      {!isLoading && (
        <>
          {(Object.keys(beaconCoords) as OrganType[]).map((organKey) => {
            const beacon = beaconCoords[organKey];
            if (!beacon.visible) return null;

            const isSelected = selectedOrgan === organKey;
            const isHovered = hoveredHotspot === organKey;
            const organMeta = ORGAN_3D_POSITIONS[organKey];
            const opacity = beacon.isFacing ? 1 : 0.25;
            const pointerEvents = beacon.isFacing ? 'auto' : 'none';

            // Custom color themes per organ
            const getBeaconColor = () => {
              switch (organKey) {
                case 'heart':
                  return 'from-rose-500 to-red-600 border-rose-300 shadow-rose-500/60 text-rose-500';
                case 'brain':
                  return 'from-purple-500 to-indigo-600 border-purple-300 shadow-purple-500/60 text-purple-500';
                case 'stomach':
                  return 'from-amber-500 to-orange-600 border-amber-300 shadow-amber-500/60 text-amber-500';
                case 'lungs':
                  return 'from-cyan-500 to-teal-600 border-cyan-300 shadow-cyan-500/60 text-cyan-500';
                case 'eyes':
                  return 'from-blue-500 to-sky-600 border-blue-300 shadow-blue-500/60 text-blue-500';
                case 'mobility':
                  return 'from-emerald-500 to-teal-600 border-emerald-300 shadow-emerald-500/60 text-emerald-500';
                case 'skin':
                default:
                  return 'from-pink-500 to-rose-600 border-pink-300 shadow-pink-500/60 text-pink-500';
              }
            };

            return (
              <div
                key={organKey}
                style={{
                  position: 'absolute',
                  left: `${beacon.x}px`,
                  top: `${beacon.y}px`,
                  transform: 'translate(-50%, -50%)',
                  opacity,
                  pointerEvents,
                  transition: 'opacity 0.2s ease, transform 0.15s ease',
                  zIndex: isSelected ? 25 : isHovered ? 24 : 15,
                }}
                className="group cursor-pointer"
                onClick={() => onSelectOrgan(organKey)}
                onMouseEnter={() => setHoveredHotspot(organKey)}
                onMouseLeave={() => setHoveredHotspot(null)}
              >
                {/* Glowing Concentric Radar Pulse Ring */}
                <div className="relative flex items-center justify-center">
                  {/* Expanding Ping Ring on Selected */}
                  {isSelected && (
                    <span className="absolute w-8 h-8 rounded-full bg-white/40 dark:bg-purple-400/40 animate-ping pointer-events-none" />
                  )}

                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getBeaconColor()} p-0.5 border shadow-xl flex items-center justify-center transition-all duration-300 group-hover:scale-130 ${
                      isSelected ? 'scale-125 ring-2 ring-white shadow-2xl animate-pulse' : ''
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                  </div>

                  {/* High-Tech Telemetry Tooltip Tag on Hover or Selected */}
                  <div
                    className={`absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-xl transition-all duration-200 flex items-center gap-1.5 ${
                      isSelected || isHovered
                        ? 'opacity-100 scale-100 bg-slate-900/90 dark:bg-black/90 text-white backdrop-blur-md border border-purple-500/40 ring-1 ring-purple-500/20 pointer-events-auto'
                        : 'opacity-0 scale-95 pointer-events-none'
                    }`}
                  >
                    <span className="font-extrabold uppercase tracking-wide">{organMeta.label}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/20 text-cyan-300 font-mono">
                      {organMeta.badge}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Interactive Helper Badge */}
      <div className="absolute top-3 left-3 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-[#12151E]/80 backdrop-blur-md border border-slate-200 dark:border-white/10 text-[10px] text-slate-600 dark:text-slate-300 font-medium shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <span>3D Hologram • Drag to rotate • Click organ to inspect</span>
      </div>

      {/* Floating 3D Control Pill Bar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 p-1 rounded-full bg-white/85 dark:bg-[#12151E]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-lg text-slate-700 dark:text-slate-200">
        {/* Flip Anterior (Front) / Posterior (Back) */}
        <button
          onClick={handleFlipView}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
            viewAngle === 'posterior'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
              : 'hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
          }`}
          title="Switch between Front (Anterior) and Back (Posterior) view"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{viewAngle === 'anterior' ? 'Front' : 'Back'}</span>
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-0.5" />

        {/* Play / Pause Turntable Continuous Rotation */}
        <button
          onClick={handleToggleTurntable}
          className={`p-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            rotationMode === 'turntable'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'hover:bg-slate-200 dark:hover:bg-white/10'
          }`}
          title={rotationMode === 'turntable' ? 'Pause 360° Rotation' : '360° Turntable Mode'}
        >
          {rotationMode === 'turntable' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {/* Reset Camera View */}
        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Reset Camera View to Default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Zoom In */}
        <button
          onClick={() => handleZoom('in')}
          className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => handleZoom('out')}
          className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Hologram / Wireframe Mode */}
        <button
          onClick={() => setIsWireframe(!isWireframe)}
          className={`p-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            isWireframe
              ? 'bg-cyan-500 text-white'
              : 'hover:bg-slate-200 dark:hover:bg-white/10'
          }`}
          title="Toggle Hologram Wireframe Matrix"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
