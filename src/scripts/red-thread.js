/* ============================================================
   Red Thread —— 首屏的红线
   Verlet 物理：重力让线垂坠，光标靠近时线被牵引过去。
   原生 canvas，不依赖 p5，约 4KB。
   ============================================================ */

const SEGMENTS = 110;      // 每根线的节点数，越多越柔顺
const ITERATIONS = 16;     // 约束求解次数，越多线越"硬"
const DAMPING = 0.972;     // 速度衰减，越小越黏滞
const GRAVITY = 0.14;
const POINTER_RADIUS = 260;
const POINTER_PULL = 0.5;  // 牵引强度
const BEND = 0.34;         // 弯曲刚度：阻止线自己对折成锯齿

/** 三根线：主线是朱砂红，另两根淡的用来做景深 */
const STRANDS = [
  { anchorL: 0.30, anchorR: 0.46, slack: 1.14, width: 2.2, color: '#C7402B', alpha: 1.00, pull: 1.00 },
  { anchorL: 0.44, anchorR: 0.34, slack: 1.09, width: 1.2, color: '#C7402B', alpha: 0.30, pull: 0.60 },
  { anchorL: 0.24, anchorR: 0.56, slack: 1.20, width: 1.0, color: '#97907F', alpha: 0.34, pull: 0.38 },
];

export function initRedThread(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let strands = [];
  let raf = null;
  let visible = true;

  const pointer = { x: 0, y: 0, active: false };

  /* ---------- 建线 ---------- */

  function buildStrand(spec) {
    const x0 = -40;
    const x1 = W + 40;
    const y0 = H * spec.anchorL;
    const y1 = H * spec.anchorR;

    const points = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const t = i / (SEGMENTS - 1);
      const x = x0 + (x1 - x0) * t;
      // 初始就给一点下垂，避免第一帧是条直线
      const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * H * 0.12;
      points.push({ x, y, px: x, py: y, pinned: i === 0 || i === SEGMENTS - 1 });
    }

    // 静止长度略大于两端直线距离 → 线会自然垂成悬链形
    const span = Math.hypot(x1 - x0, y1 - y0);
    const rest = (span / (SEGMENTS - 1)) * spec.slack;

    return { ...spec, points, rest };
  }

  function rebuild() {
    strands = STRANDS.map(buildStrand);
  }

  /* ---------- 物理 ---------- */

  function integrate(strand) {
    for (const p of strand.points) {
      if (p.pinned) continue;

      const vx = (p.x - p.px) * DAMPING;
      const vy = (p.y - p.py) * DAMPING;

      p.px = p.x;
      p.py = p.y;
      p.x += vx;
      p.y += vy + GRAVITY;

      if (!pointer.active) continue;

      // 牵引：光标半径内的节点被拉向光标，距离越近越强
      const dx = pointer.x - p.x;
      const dy = pointer.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1 && dist < POINTER_RADIUS) {
        const falloff = 1 - dist / POINTER_RADIUS;
        const force = falloff * falloff * POINTER_PULL * strand.pull;
        p.x += (dx / dist) * force * 6;
        p.y += (dy / dist) * force * 6;
      }
    }
  }

  function constrain(strand) {
    const { points, rest } = strand;

    for (let k = 0; k < ITERATIONS; k++) {
      // 1) 长度约束：相邻节点保持固定间距
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;

        const diff = (dist - rest) / dist;
        const ox = dx * diff * 0.5;
        const oy = dy * diff * 0.5;

        if (!a.pinned) { a.x += ox; a.y += oy; }
        if (!b.pinned) { b.x -= ox; b.y -= oy; }
      }

      // 2) 弯曲刚度：隔一个取一对，只在它们靠得太近时把它们推开。
      //    没有这一步，绳子被压缩时会高频对折成锯齿——看起来像毛刺而不是线。
      const bendTarget = rest * 1.94;

      for (let i = 0; i < points.length - 2; i++) {
        const a = points[i];
        const b = points[i + 2];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;

        if (dist >= bendTarget) continue; // 只抗折叠，不抗伸展

        const diff = ((dist - bendTarget) / dist) * BEND;
        const ox = dx * diff * 0.5;
        const oy = dy * diff * 0.5;

        if (!a.pinned) { a.x += ox; a.y += oy; }
        if (!b.pinned) { b.x -= ox; b.y -= oy; }
      }
    }
  }

  /* ---------- 绘制 ---------- */

  function drawStrand(strand) {
    const { points, width, color, alpha } = strand;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 用中点做二次贝塞尔，把折线磨成顺滑曲线
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

    // 垫一层极淡的阴影，让线从纸面浮起来
    ctx.save();
    ctx.globalAlpha = alpha * 0.18;
    ctx.lineWidth = width * 3;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();

    ctx.lineWidth = width;
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    for (const strand of strands) drawStrand(strand);
  }

  function frame() {
    if (visible) {
      for (const strand of strands) {
        integrate(strand);
        constrain(strand);
      }
      render();
    }
    raf = requestAnimationFrame(frame);
  }

  /* ---------- 尺寸 ---------- */

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuild();
  }

  /* ---------- 输入 ---------- */

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = true;
  }

  function onPointerLeave() {
    pointer.active = false;
  }

  /* ---------- 启动 ---------- */

  resize();

  if (reduced) {
    // 尊重系统「减少动态效果」：只解算出静止形态，画一帧
    for (const strand of strands) {
      for (let i = 0; i < 90; i++) { integrate(strand); constrain(strand); }
    }
    render();
    return () => {};
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // 滚出视口就停算，省电
  const io = new IntersectionObserver(
    ([entry]) => { visible = entry.isIntersecting; },
    { threshold: 0 }
  );
  io.observe(canvas);

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });

  frame();

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerleave', onPointerLeave);
  };
}
