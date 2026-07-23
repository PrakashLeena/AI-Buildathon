import { useEffect } from 'react';

/**
 * Morphing 3D particle sphere canvas for the About section
 * (ported 1:1 from the original app.js `initAboutCanvas`).
 */
export default function useAboutSphereCanvas(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let points = [];
    const numPoints = 140;
    const radius = 90;

    let angleX = 0.003;
    let angleY = 0.004;

    const mouse = { x: null, y: null, targetX: 0, targetY: 0, currentX: 0, currentY: 0 };

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width || 380;
      canvas.height = rect.width || 380;
    };
    resize();
    window.addEventListener('resize', resize);

    const initPoints = () => {
      points = [];
      for (let i = 0; i < numPoints; i++) {
        const theta = Math.acos(1 - 2 * (i / numPoints));
        const phi = Math.PI * (1 + Math.sqrt(5)) * i;

        points.push({
          x: Math.sin(theta) * Math.cos(phi),
          y: Math.sin(theta) * Math.sin(phi),
          z: Math.cos(theta),
          baseX: Math.sin(theta) * Math.cos(phi),
          baseY: Math.sin(theta) * Math.sin(phi),
          baseZ: Math.cos(theta),
          phase: Math.random() * Math.PI * 2
        });
      }
    };
    initPoints();

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.targetX = (mouse.x / canvas.width - 0.5) * 0.4;
      mouse.targetY = (mouse.y / canvas.height - 0.5) * 0.4;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
      mouse.targetX = 0;
      mouse.targetY = 0;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const project = (x, y, z) => {
      const fov = 220;
      const distance = 2.0;
      const scale = fov / (distance + z);
      return {
        x: x * scale + canvas.width / 2,
        y: y * scale + canvas.height / 2,
        scale
      };
    };

    let animationFrameId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      mouse.currentX += (mouse.targetX - mouse.currentX) * 0.08;
      mouse.currentY += (mouse.targetY - mouse.currentY) * 0.08;

      const time = Date.now() * 0.0012;

      const cosY = Math.cos(angleY + mouse.currentX);
      const sinY = Math.sin(angleY + mouse.currentX);
      const cosX = Math.cos(angleX + mouse.currentY);
      const sinX = Math.sin(angleX + mouse.currentY);

      const projected = points.map((p) => {
        const wave = Math.sin(time + p.phase) * 0.1;
        const mx = p.baseX * (1 + wave);
        const my = p.baseY * (1 + wave);
        const mz = p.baseZ * (1 + wave);

        const x1 = mx * cosY - mz * sinY;
        const z1 = mz * cosY + mx * sinY;
        const y2 = my * cosX - z1 * sinX;
        const z2 = z1 * cosX + my * sinX;

        const rx = x1 * radius;
        const ry = y2 * radius;
        const rz = z2 * radius;

        const proj = project(rx, ry, rz / 180);
        return { x: proj.x, y: proj.y, z: rz, scale: proj.scale };
      });

      projected.sort((a, b) => a.z - b.z);

      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        let connCount = 0;
        for (let j = i + 1; j < projected.length; j++) {
          const p2 = projected[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 42 && connCount < 2) {
            const alpha = (1 - dist / 42) * 0.12 * ((p1.z + radius) / (radius * 2));
            ctx.strokeStyle = `rgba(255, 85, 0, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            connCount++;
          }
        }
      }

      projected.forEach((p) => {
        const size = Math.max(0.8, p.scale * 0.015);
        const opacity = Math.min(1, Math.max(0.1, (p.z + radius) / (radius * 2)));

        ctx.fillStyle = `rgba(255, 85, 0, ${opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      angleY += 0.002;
      angleX += 0.001;

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [canvasRef]);
}
