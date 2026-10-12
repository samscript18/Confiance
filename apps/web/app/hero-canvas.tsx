"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  color: string;
  alpha: number;
  phase: number;
}

interface LaserPulse {
  fromIndex: number;
  toIndex: number;
  progress: number;
  speed: number;
  color: string;
}

export function HeroBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width =
      canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 820);

    const onResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", onResize);

    const mouse = {
      x: width / 2,
      y: height / 3,
      radius: 180,
      active: false,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    const colors: readonly string[] = [
      "231, 123, 81", // Coral #9B7FD4
      "225, 173, 45", // Gold #7B5FB8
      "255, 136, 90", // Light Coral #B89FE8
      "133, 108, 208", // Monad Violet #856cd0
    ];

    const particleCount = Math.min(65, Math.floor((width * height) / 14000));
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const colorPicked =
        colors[Math.floor(Math.random() * colors.length)] ?? "231, 123, 81";
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        baseRadius: Math.random() * 2 + 1,
        radius: Math.random() * 2 + 1,
        color: colorPicked,
        alpha: Math.random() * 0.6 + 0.25,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const pulses: LaserPulse[] = [];

    const spawnPulse = () => {
      if (pulses.length >= 6 || particles.length < 2) return;
      const i = Math.floor(Math.random() * particles.length);
      const origin = particles[i];
      if (!origin) return;

      let closest = -1;
      let minDistance = 180;
      for (let j = 0; j < particles.length; j++) {
        if (i === j) continue;
        const target = particles[j];
        if (!target) continue;
        const dx = origin.x - target.x;
        const dy = origin.y - target.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDistance) {
          minDistance = dist;
          closest = j;
        }
      }

      if (closest !== -1) {
        pulses.push({
          fromIndex: i,
          toIndex: closest,
          progress: 0,
          speed: 0.015 + Math.random() * 0.02,
          color: Math.random() > 0.4 ? "#9B7FD4" : "#7B5FB8",
        });
      }
    };

    let tick = 0;
    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      if (tick % 45 === 0) {
        spawnPulse();
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        p.radius = p.baseRadius + Math.sin(tick * 0.03 + p.phase) * 0.8;

        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < mouse.radius && dist > 0) {
            const force = (1 - dist / mouse.radius) * 1.5;
            p.x -= (dx / dist) * force;
            p.y -= (dy / dist) * force;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.shadowColor = `rgba(${p.color}, 0.8)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        if (!p1) continue;
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          if (!p2) continue;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.hypot(dx, dy);
          const maxDist = 135;

          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(155, 127, 212, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      for (let k = pulses.length - 1; k >= 0; k--) {
        const pulse = pulses[k];
        if (!pulse) continue;
        pulse.progress += pulse.speed;
        if (pulse.progress >= 1) {
          pulses.splice(k, 1);
          continue;
        }

        const pA = particles[pulse.fromIndex];
        const pB = particles[pulse.toIndex];
        if (!pA || !pB) {
          pulses.splice(k, 1);
          continue;
        }

        const px = pA.x + (pB.x - pA.x) * pulse.progress;
        const py = pA.y + (pB.y - pA.y) * pulse.progress;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = pulse.color;
        ctx.shadowColor = pulse.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-80 transition-opacity duration-1000"
      aria-hidden="true"
    />
  );
}
