import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface CosmicIntroProps {
  onComplete: () => void;
  autoPlayDuration?: number; // total seconds before auto-transitioning
}

interface Particle {
  x: number;
  y: number;
  z: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  hasTarget: boolean;
  vx: number;
  vy: number;
  color: string;
  glowColor: string;
  size: number;
  alpha: number;
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  swirlRadius: number;
  swirlAngle: number;
  trail: { x: number; y: number }[];
  twinklePhase: number;
  twinkleSpeed: number;
}

interface SparkleGlint {
  x: number;
  y: number;
  size: number;
  maxSize: number;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  color: string;
}

const COSMIC_PALETTE = [
  { color: '#ffffff', glow: 'rgba(255, 255, 255, 0.8)' },
  { color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.8)' }, // Cyan starlight
  { color: '#818cf8', glow: 'rgba(129, 140, 248, 0.8)' }, // Electric indigo
  { color: '#c084fc', glow: 'rgba(192, 132, 252, 0.8)' }, // Cosmic purple
  { color: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.7)' }, // Emerald teal
  { color: '#f472b6', glow: 'rgba(244, 114, 182, 0.6)' }, // Soft magenta
];

export const CosmicIntro: React.FC<CosmicIntroProps> = ({
  onComplete,
  autoPlayDuration = 10.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showTextLayer, setShowTextLayer] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [shimmerPosition, setShimmerPosition] = useState(-100);

  const handleFinish = useCallback(() => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      onComplete();
    }, 900);
  }, [isFadingOut, onComplete]);

  // Keyboard shortcut: Escape or Space to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // High DPI scaling
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);

    // =========================================================================
    // STEP 1: Generate Letter Target Coordinates for "NovaMind"
    // =========================================================================
    const sampleTextTargets = (
      text: string,
      fontSize: number
    ): { x: number; y: number }[] => {
      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return [];

      offscreen.width = width;
      offscreen.height = height;

      offCtx.fillStyle = '#ffffff';
      offCtx.font = `900 ${fontSize}px "Space Grotesk", system-ui, -apple-system, sans-serif`;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';

      const cx = width / 2;
      const cy = height / 2 - 20;

      offCtx.fillText(text, cx, cy);

      const imgData = offCtx.getImageData(0, 0, width, height);
      const points: { x: number; y: number }[] = [];

      // Adaptive sampling step based on screen width
      const step = width < 640 ? 4 : width < 1024 ? 4 : 5;

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (y * width + x) * 4;
          const alpha = imgData.data[index + 3];
          if (alpha > 140) {
            // Add tiny random jitter for organic feel
            points.push({
              x: x + (Math.random() - 0.5) * 1.5,
              y: y + (Math.random() - 0.5) * 1.5,
            });
          }
        }
      }

      return points;
    };

    const responsiveFontSize = Math.min(
      Math.max(width * 0.12, 48),
      width < 640 ? 64 : 110
    );
    const targetPoints = sampleTextTargets('NovaMind', responsiveFontSize);

    // =========================================================================
    // STEP 2: Initialize 900+ Cosmic Particles
    // =========================================================================
    const TOTAL_PARTICLES = Math.max(targetPoints.length + 220, 850);
    const particles: Particle[] = [];
    const cx = width / 2;
    const cy = height / 2;

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const isTarget = i < targetPoints.length;
      const target = isTarget ? targetPoints[i] : null;

      // Start scattered randomly throughout the cosmos
      const randomAngle = Math.random() * Math.PI * 2;
      const maxDist = Math.max(width, height) * 0.85;
      const randomDist = 60 + Math.random() * maxDist;

      const px = cx + Math.cos(randomAngle) * randomDist;
      const py = cy + Math.sin(randomAngle) * randomDist;

      const paletteItem =
        COSMIC_PALETTE[Math.floor(Math.random() * COSMIC_PALETTE.length)];

      particles.push({
        x: px,
        y: py,
        z: 0.3 + Math.random() * 1.7,
        originX: px,
        originY: py,
        targetX: target ? target.x : cx + (Math.random() - 0.5) * width * 0.7,
        targetY: target ? target.y : cy + (Math.random() - 0.5) * height * 0.5,
        hasTarget: isTarget,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        color: paletteItem.color,
        glowColor: paletteItem.glow,
        size: 1.2 + Math.random() * 2.2,
        alpha: 0.3 + Math.random() * 0.7,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitRadius: 20 + Math.random() * (maxDist * 0.5),
        orbitSpeed: (0.005 + Math.random() * 0.015) * (Math.random() > 0.5 ? 1 : -1),
        swirlRadius: randomDist,
        swirlAngle: randomAngle,
        trail: [],
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.03 + Math.random() * 0.05,
      });
    }

    // Occasional Diamond Star Sparkles
    const sparkles: SparkleGlint[] = [];

    // =========================================================================
    // STEP 3: Animation Loop with Cinematic Timeline
    // =========================================================================
    const startTime = performance.now();
    let textLayerTriggered = false;
    let subtitleTriggered = false;

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000; // in seconds

      // Background Rendering with Ethereal Cosmic Deep Space Glow
      // Clear with subtle alpha to create elegant motion blur trails
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle =
        elapsed < 1.5
          ? '#050711'
          : elapsed < 5.5
          ? 'rgba(5, 7, 17, 0.22)' // Trail retention during galaxy swirl
          : 'rgba(5, 7, 17, 0.35)'; // Clean convergence as text forms
      ctx.fillRect(0, 0, width, height);

      // Deep space ambient radial gradient glow
      const radialGlow = ctx.createRadialGradient(
        cx,
        cy - 10,
        0,
        cx,
        cy - 10,
        Math.max(width, height) * 0.65
      );
      radialGlow.addColorStop(0, 'rgba(40, 20, 80, 0.2)');
      radialGlow.addColorStop(0.3, 'rgba(15, 23, 60, 0.15)');
      radialGlow.addColorStop(0.7, 'rgba(6, 8, 20, 0.08)');
      radialGlow.addColorStop(1, 'rgba(3, 4, 10, 0)');
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, width, height);

      // Central Stargate Nebula Core during galaxy swirl
      if (elapsed > 1.8 && elapsed < 6.8) {
        const coreIntensity = Math.min((elapsed - 1.8) / 2.0, 1) * Math.max(0, (6.8 - elapsed) / 1.5);
        const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180);
        coreGradient.addColorStop(0, `rgba(168, 85, 247, ${coreIntensity * 0.45})`);
        coreGradient.addColorStop(0.4, `rgba(56, 189, 248, ${coreIntensity * 0.25})`);
        coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGradient;
        ctx.fillRect(cx - 200, cy - 200, 400, 400);
      }

      // Additive blending for vivid, glowing cosmic lights
      ctx.globalCompositeOperation = 'lighter';

      // =======================================================================
      // PHASE TIMINGS:
      // 0.0s - 1.6s: Scattered glowing stars drifting in deep space
      // 1.6s - 4.8s: Gravitational pull & swirling galaxy vortex
      // 4.8s - 7.5s: Precise magnetic convergence into "NovaMind"
      // 7.5s - 10.5s: Crystalline locked state with shimmering light rays & sparkles
      // 10.5s+: Stable readability and smooth transition to app
      // =======================================================================

      // Trigger UI overlays at key cinematic moments
      if (elapsed >= 6.8 && !textLayerTriggered) {
        setShowTextLayer(true);
        textLayerTriggered = true;
      }
      if (elapsed >= 7.6 && !subtitleTriggered) {
        setShowSubtitle(true);
        subtitleTriggered = true;
      }

      // Shimmer wave across text (starts at 7.2s)
      if (elapsed >= 7.2 && elapsed <= 9.8) {
        const shimmerProgress = (elapsed - 7.2) / 2.6; // 0 to 1
        setShimmerPosition(-50 + shimmerProgress * 200);
      }

      // Spawn occasional sparkles at letter peaks in phase 4
      if (elapsed >= 6.5 && Math.random() < 0.28 && targetPoints.length > 0) {
        const randomTarget =
          targetPoints[Math.floor(Math.random() * targetPoints.length)];
        sparkles.push({
          x: randomTarget.x + (Math.random() - 0.5) * 8,
          y: randomTarget.y + (Math.random() - 0.5) * 8,
          size: 0,
          maxSize: 6 + Math.random() * 8,
          alpha: 1,
          life: 0,
          maxLife: 35 + Math.floor(Math.random() * 25),
          rotation: Math.random() * Math.PI,
          color: Math.random() > 0.4 ? '#ffffff' : '#38bdf8',
        });
      }

      // Update and Draw Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.twinklePhase += p.twinkleSpeed;
        const twinkle = 0.7 + Math.sin(p.twinklePhase) * 0.3;

        // Phase 1: Deep Space Drift (0.0s - 1.6s)
        if (elapsed < 1.6) {
          p.x += p.vx * 0.8;
          p.y += p.vy * 0.8;
          p.trail = [];
        }
        // Phase 2: Inward Swirl / Galaxy Vortex (1.6s - 4.8s)
        else if (elapsed < 4.8) {
          const swirlProgress = (elapsed - 1.6) / 3.2; // 0 to 1
          const easeIn = swirlProgress * swirlProgress;

          // Inward radial pull
          const targetSwirlRadius =
            p.swirlRadius * Math.max(0.08, 1 - easeIn * 0.82);

          // Angular velocity increases as particles approach center (conservation of angular momentum)
          const spinSpeed = 0.035 + (1 - swirlProgress) * 0.02 + 12 / (targetSwirlRadius + 40);
          p.swirlAngle += spinSpeed * 0.65;

          const destX = cx + Math.cos(p.swirlAngle) * targetSwirlRadius;
          const destY = cy + Math.sin(p.swirlAngle) * targetSwirlRadius * 0.65; // Elliptical galaxy tilt

          // Save trail
          p.trail.unshift({ x: p.x, y: p.y });
          if (p.trail.length > 5) p.trail.pop();

          // Move towards vortex path with momentum
          p.x += (destX - p.x) * (0.12 + easeIn * 0.08);
          p.y += (destY - p.y) * (0.12 + easeIn * 0.08);
        }
        // Phase 3 & 4: Convergence into "NovaMind" (4.8s+)
        else {
          const convergeProgress = Math.min((elapsed - 4.8) / 2.4, 1.0);
          // Ease-out cubic for smooth deceleration
          const easeOut = 1 - Math.pow(1 - convergeProgress, 3);

          if (p.hasTarget) {
            // Magnetic attraction to exact letter pixel position
            const tx = p.targetX;
            const ty = p.targetY;

            // Dampened spring physics
            const dx = tx - p.x;
            const dy = ty - p.y;
            p.vx = (p.vx + dx * 0.08) * 0.78;
            p.vy = (p.vy + dy * 0.08) * 0.78;

            p.x += p.vx;
            p.y += p.vy;

            // Reduce trail length as particles settle into typography
            if (convergeProgress > 0.8) {
              p.trail = [];
            } else if (p.trail.length > 2) {
              p.trail.pop();
            }
          } else {
            // Surplus particles become floating orbital stardust
            p.orbitAngle += p.orbitSpeed * 0.5;
            const ox = cx + Math.cos(p.orbitAngle) * (p.orbitRadius + 40);
            const oy = cy + Math.sin(p.orbitAngle) * (p.orbitRadius * 0.45 + 30);
            p.x += (ox - p.x) * 0.04;
            p.y += (oy - p.y) * 0.04;
          }
        }

        // DRAW PARTICLE TRAILS (During Vortex Swirl)
        if (p.trail.length > 1 && elapsed > 1.6 && elapsed < 6.8) {
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let t = 1; t < p.trail.length; t++) {
            ctx.lineTo(p.trail[t].x, p.trail[t].y);
          }
          ctx.strokeStyle = p.glowColor;
          ctx.lineWidth = Math.max(0.6, p.size * 0.7);
          ctx.stroke();
        }

        // DRAW MAIN GLOWING STAR PARTICLE
        const currentAlpha = Math.min(p.alpha * twinkle, 1.0);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.8, p.size * 0.75), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha;
        ctx.fill();

        // Soft outer halo for brightest particles
        if (p.size > 2.0 && currentAlpha > 0.4) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = p.glowColor;
          ctx.globalAlpha = currentAlpha * 0.28;
          ctx.fill();
        }
      }

      // DRAW 4-POINT DIAMOND SPARKLES
      for (let s = sparkles.length - 1; s >= 0; s--) {
        const sp = sparkles[s];
        sp.life++;
        const progress = sp.life / sp.maxLife;

        // Flare curve: rise fast, fade slowly
        const flareScale = Math.sin(progress * Math.PI);
        const currentSize = sp.maxSize * flareScale;
        const currentAlpha = (1 - progress) * 0.9;

        if (currentSize > 0.5) {
          ctx.save();
          ctx.translate(sp.x, sp.y);
          ctx.rotate(sp.rotation);

          // Horizontal & Vertical glint rays
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = currentAlpha;

          // Horizontal diamond ray
          ctx.beginPath();
          ctx.moveTo(-currentSize * 2.2, 0);
          ctx.lineTo(0, -currentSize * 0.35);
          ctx.lineTo(currentSize * 2.2, 0);
          ctx.lineTo(0, currentSize * 0.35);
          ctx.closePath();
          ctx.fill();

          // Vertical diamond ray
          ctx.beginPath();
          ctx.moveTo(0, -currentSize * 2.2);
          ctx.lineTo(-currentSize * 0.35, 0);
          ctx.lineTo(0, currentSize * 2.2);
          ctx.lineTo(currentSize * 0.35, 0);
          ctx.closePath();
          ctx.fill();

          // Center bright point
          ctx.beginPath();
          ctx.arc(0, 0, currentSize * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.restore();
        }

        if (sp.life >= sp.maxLife) {
          sparkles.splice(s, 1);
        }
      }

      ctx.globalAlpha = 1.0;

      // Auto-transition when total duration reached
      if (elapsed >= autoPlayDuration) {
        handleFinish();
        return;
      }

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [autoPlayDuration, handleFinish]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050711] select-none transition-opacity duration-1000 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ overflow: 'hidden' }}
    >
      {/* Background Interactive WebGL / 2D Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-pointer"
        onClick={handleFinish}
        title="Click to enter platform"
      />

      {/* Futuristic Typography Overlay with Soft Neon Bloom */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center pointer-events-none transition-all duration-1000 transform ${
          showTextLayer
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-3'
        }`}
      >
        {/* Core Glowing Brand Title */}
        <div className="relative group">
          {/* Subtle Ambient Back-Glow */}
          <div
            className="absolute -inset-4 rounded-3xl blur-2xl opacity-60 transition-opacity duration-1000 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(56, 189, 248, 0.3) 50%, transparent 75%)',
            }}
          />

          <h1
            className="relative text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white px-6 py-2"
            style={{
              fontFamily: '"Space Grotesk", system-ui, -apple-system, sans-serif',
              textShadow:
                '0 0 20px rgba(168, 85, 247, 0.7), 0 0 45px rgba(56, 189, 248, 0.5), 0 0 80px rgba(168, 85, 247, 0.3)',
              letterSpacing: '-0.02em',
            }}
          >
            <span className="bg-gradient-to-r from-white via-cyan-100 to-purple-200 bg-clip-text text-transparent">
              NovaMind
            </span>
          </h1>

          {/* Sweeping Light Shimmer Ray */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
            style={{
              maskImage: 'linear-gradient(to right, black, black)',
            }}
          >
            <div
              className="absolute top-0 bottom-0 w-32 -skew-x-25 bg-gradient-to-r from-transparent via-white/40 to-transparent blur-sm transition-all"
              style={{
                left: `${shimmerPosition}%`,
                display: shimmerPosition >= -30 && shimmerPosition <= 130 ? 'block' : 'none',
              }}
            />
          </div>
        </div>

        {/* Elegant AI Tagline Subtitle */}
        <div
          className={`flex items-center gap-3 mt-4 transition-all duration-1000 ${
            showSubtitle
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-r from-transparent to-cyan-400/80" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-cyan-400/30 text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-cyan-300 shadow-sm backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>AI Innovation &amp; Structuring Platform</span>
          </div>
          <div className="h-[1px] w-8 sm:w-16 bg-gradient-to-l from-transparent to-purple-400/80" />
        </div>
      </div>

      {/* Top-Right "Skip Intro" Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={handleFinish}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-purple-500/40 backdrop-blur-md transition-all shadow-lg group hover:scale-105 active:scale-95"
          title="Skip intro and enter platform"
        >
          <span>Skip Intro</span>
          <span className="text-[10px] text-gray-400 group-hover:text-purple-300 border border-white/10 px-1.5 py-0.2 rounded font-mono">
            ESC
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-6 z-20 text-[11px] text-gray-500 flex items-center gap-2 font-mono tracking-wider pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        <span>INITIALIZING NEURAL INNOVATION MESH</span>
      </div>
    </div>
  );
};
