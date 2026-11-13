import React, { useEffect, useRef } from 'react';

interface LightningProps {
  active: boolean;
  waveNumber: number;
}

export const LightningCanvas: React.FC<LightningProps> = ({ active, waveNumber }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    const height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    interface Point {
      x: number;
      y: number;
    }

    interface Bolt {
      segments: { start: Point; end: Point; width: number }[];
      color: string;
      glowColor: string;
      alpha: number;
    }

    function createLightning(startX: number, startY: number, endX: number, endY: number, depth: number = 0): { start: Point; end: Point; width: number }[] {
      const segments: { start: Point; end: Point; width: number }[] = [];
      const dist = Math.hypot(endX - startX, endY - startY);
      if (dist < 15 || depth > 5) {
        segments.push({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          width: Math.max(1, 4 - depth * 0.6),
        });
        return segments;
      }

      const midX = (startX + endX) / 2 + (Math.random() - 0.5) * (dist * 0.35);
      const midY = (startY + endY) / 2 + (Math.random() - 0.5) * (dist * 0.2);

      segments.push(...createLightning(startX, startY, midX, midY, depth + 1));
      segments.push(...createLightning(midX, midY, endX, endY, depth + 1));

      // Occasional branch
      if (Math.random() < 0.45 && depth < 3) {
        const branchEndX = midX + (Math.random() - 0.5) * dist * 0.6;
        const branchEndY = midY + Math.random() * dist * 0.5;
        segments.push(...createLightning(midX, midY, branchEndX, branchEndY, depth + 2));
      }

      return segments;
    }

    const bolts: Bolt[] = [];
    const colors = [
      { main: '#f472b6', glow: '#a855f7' }, // purple/violet heavenly thunder
      { main: '#fbbf24', glow: '#f59e0b' }, // golden tribulation thunder
      { main: '#38bdf8', glow: '#6366f1' }, // cyan ethereal thunder
      { main: '#ffffff', glow: '#c084fc' }, // pure divine white
    ];

    // Generate 4 to 6 random bolts hitting the board
    const boltCount = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < boltCount; i++) {
      const startX = width * 0.1 + Math.random() * width * 0.8;
      const startY = 0;
      const endX = width * 0.2 + Math.random() * width * 0.6;
      const endY = height * 0.35 + Math.random() * height * 0.5;

      const c = colors[Math.floor(Math.random() * colors.length)];
      bolts.push({
        segments: createLightning(startX, startY, endX, endY),
        color: c.main,
        glowColor: c.glow,
        alpha: 1.0,
      });
    }

    let startTime = performance.now();
    const duration = 700; // ms

    function render(currentTime: number) {
      if (!ctx || !canvas) return;
      const elapsed = currentTime - startTime;
      const progress = elapsed / duration;

      ctx.clearRect(0, 0, width, height);

      // Flash background
      if (progress < 0.35) {
        const flashAlpha = (1 - progress / 0.35) * 0.28;
        ctx.fillStyle = waveNumber % 2 === 0 ? `rgba(168, 85, 247, ${flashAlpha})` : `rgba(245, 158, 11, ${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
      }

      if (progress < 1.0) {
        const alpha = Math.max(0, 1 - progress * 1.15);
        for (const bolt of bolts) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.shadowBlur = 18;
          ctx.shadowColor = bolt.glowColor;

          for (const seg of bolt.segments) {
            ctx.beginPath();
            ctx.strokeStyle = bolt.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = seg.width;
            ctx.moveTo(seg.start.x, seg.start.y);
            ctx.lineTo(seg.end.x, seg.end.y);
            ctx.stroke();
          }
          ctx.restore();
        }
        animationFrameId = requestAnimationFrame(render);
      }
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, waveNumber]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-50 h-full w-full"
    />
  );
};
