import { useEffect, useRef } from 'react';
import { isAnimationsEnabled } from '../../lib/settings.js';

// זהב + טורקיז המותג — לא ריבועים/כתום/סגול נופלים כמו קודם.
const COLORS = ['#FFD700', '#FDB813', '#00bfa5', '#26e0c9'];
const FRICTION = 0.97;

export default function Confetti({ count = 30, durationMs = 1000 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isAnimationsEnabled()) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const cx = canvas.width / 2;
    const cy = canvas.height / 3;
    const particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    const start = performance.now();
    let raf;

    function tick(now) {
      const elapsed = now - start;
      const opacity = Math.max(0, 1 - elapsed / durationMs);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= FRICTION;
        p.vy *= FRICTION;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = opacity;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (elapsed < durationMs) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [count, durationMs]);

  if (!isAnimationsEnabled()) return null;

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[100]" aria-hidden="true" />;
}
