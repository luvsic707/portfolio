/* ============================================================
   Thread Curtain —— 首屏的红线帘

   一整面从顶部垂下的线，Verlet 物理。光标穿过时线会像真帘子
   一样分开；其中若干根挂着作品，是导航本身。

   原生 canvas，不依赖任何库。
   ============================================================ */

const POINTS_PER_THREAD = 20;   // 每根线的节点数
const ITERATIONS = 6;           // 约束求解次数（顶部固定的垂线不需要太多）
const DAMPING = 0.94;
const GRAVITY = 0.55;

const POINTER_RADIUS = 150;     // 光标推开线的半径
const POINTER_FORCE = 3.6;

const WIND_AMP = 0.03;          // 风的强度。调大会让线荡成钟摆，别超过 0.05
const WIND_SPEED = 0.00042;
const SWAY_LIMIT = 0.9;         // 线相对自身基准位置的最大横向漂移（乘以线长）

const COLOR_RED = '#C7402B';
const COLOR_GREY = '#B9B2A2';

export function initThreadCurtain(canvas, links = []) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0;
  let H = 0;
  let dpr = 1;
  let threads = [];
  let raf = null;
  let running = true;
  let t0 = performance.now();

  const pointer = { x: -9999, y: -9999, active: false };
  let hovered = null;   // 当前悬停的作品线
  let focused = null;   // 键盘 Tab 到的作品线

  /* ---------- 建线 ---------- */

  function build() {
    // 线的疏密跟着屏宽走，手机上不要太密
    const gap = W < 640 ? 18 : 13;
    const count = Math.max(24, Math.min(120, Math.round(W / gap)));

    // 把作品均匀分配到这些线里，两端留白避免贴边
    const slots = [];
    if (links.length) {
      const usable = count - 6;
      for (let i = 0; i < links.length; i++) {
        slots.push(3 + Math.round(((i + 0.5) / links.length) * usable));
      }
    }

    threads = [];

    for (let i = 0; i < count; i++) {
      const x = ((i + 0.5) / count) * W;

      const linkIndex = slots.indexOf(i);
      const link = linkIndex >= 0 ? links[linkIndex] : null;

      // 长度错落，避免下缘像被剪齐一样
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const rand = seed - Math.floor(seed);
      const len = link
        ? H * (0.42 + rand * 0.26)          // 挂作品的线短一些，珠子落在视野内
        : H * (0.55 + rand * 0.5);

      const points = [];
      for (let j = 0; j < POINTS_PER_THREAD; j++) {
        // 全部从顶端开始，靠重力自己垂下来 —— 入场动画不用额外写
        points.push({ x, y: 0, px: x, py: 0 });
      }

      // 未挂作品的线里掺一部分淡红，让整片有冷暖变化
      const reddish = !link && rand > 0.72;

      threads.push({
        x,
        points,
        rest: len / (POINTS_PER_THREAD - 1),
        link,
        color: link ? COLOR_RED : reddish ? COLOR_RED : COLOR_GREY,
        alpha: link ? 1 : reddish ? 0.3 : 0.42,
        width: link ? 1.7 : 0.9,
        // 挂着作品的线完全不被光标推开：珠子必须站得住，否则永远点不到它。
        // 它们仍然随风轻摆，所以不会显得僵硬。
        resist: link ? 0 : 1,
        phase: rand * Math.PI * 2,
        beadAt: POINTS_PER_THREAD - 1,
        bead: { x, y: 0 },
      });
    }
  }

  /* ---------- 物理 ---------- */

  function step(now) {
    const time = now - t0;

    for (const th of threads) {
      const { points } = th;

      // 风：越往下摆幅越大
      const wind =
        Math.sin(time * WIND_SPEED + th.phase) * WIND_AMP +
        Math.sin(time * WIND_SPEED * 2.3 + th.phase * 1.7) * WIND_AMP * 0.4;

      for (let j = 1; j < points.length; j++) {
        const p = points[j];
        const tail = j / (points.length - 1);

        const vx = (p.x - p.px) * DAMPING;
        const vy = (p.y - p.py) * DAMPING;

        p.px = p.x;
        p.py = p.y;
        p.x += vx + wind * tail;
        p.y += vy + GRAVITY;

        if (!pointer.active) continue;

        // 分帘：光标附近的点被推开，横向为主，像手穿过挂着的线
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.hypot(dx, dy);

        if (dist < POINTER_RADIUS && dist > 0.01) {
          const falloff = 1 - dist / POINTER_RADIUS;
          // 挂着作品的线更"重"，不太被推开 —— 否则珠子会一直躲开光标，永远点不到
          const f = falloff * falloff * POINTER_FORCE * th.resist;
          p.x += (dx / dist) * f * 1.9;
          p.y += (dy / dist) * f * 0.35;
        }
      }

      // 约束：顶点钉死，其余保持固定间距
      for (let k = 0; k < ITERATIONS; k++) {
        points[0].x = th.x;
        points[0].y = 0;

        for (let j = 0; j < points.length - 1; j++) {
          const a = points[j];
          const b = points[j + 1];

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          const diff = (dist - th.rest) / dist;

          const ox = dx * diff * 0.5;
          const oy = dy * diff * 0.5;

          if (j > 0) { a.x += ox; a.y += oy; }
          else { /* 顶点不动，位移全给下一个点 */ }

          b.x -= j > 0 ? ox : ox * 2;
          b.y -= j > 0 ? oy : oy * 2;
        }
      }

      // 限位：线可以荡，但不能荡到离自己挂点太远，也不能荡出画面
      const span = th.rest * (points.length - 1) * SWAY_LIMIT;
      for (let j = 1; j < points.length; j++) {
        const p = points[j];
        const lo = Math.max(2, th.x - span);
        const hi = Math.min(W - 2, th.x + span);
        if (p.x < lo) p.x = lo;
        else if (p.x > hi) p.x = hi;
      }

      const tip = points[th.beadAt];
      th.bead.x = tip.x;
      th.bead.y = tip.y;
    }
  }

  /* ---------- 绘制 ---------- */

  function drawThread(th, isActive) {
    const { points } = th;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let j = 1; j < points.length - 1; j++) {
      const mx = (points[j].x + points[j + 1].x) / 2;
      const my = (points[j].y + points[j + 1].y) / 2;
      ctx.quadraticCurveTo(points[j].x, points[j].y, mx, my);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

    ctx.strokeStyle = th.color;
    ctx.globalAlpha = isActive ? 1 : th.alpha;
    ctx.lineWidth = isActive ? th.width + 0.9 : th.width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  function drawBead(th, isActive) {
    const r = isActive ? 5.5 : 3.4;

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(th.bead.x, th.bead.y, r, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_RED;
    ctx.fill();

    if (isActive) {
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(th.bead.x, th.bead.y, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = COLOR_RED;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    // 先画普通线，作品线最后画，保证它压在上面
    for (const th of threads) if (!th.link) drawThread(th, false);

    for (const th of threads) {
      if (!th.link) continue;
      const active = th === hovered || th === focused;
      drawThread(th, active);
      drawBead(th, active);
    }

    ctx.globalAlpha = 1;
  }

  /* ---------- 作品标签跟随珠子 ---------- */

  function placeLabels() {
    for (const th of threads) {
      if (!th.link) continue;
      const el = th.link.el;
      const active = th === hovered || th === focused;

      el.style.transform = `translate(${th.bead.x}px, ${th.bead.y}px)`;
      el.classList.toggle('is-on', active);

      // 靠右侧的标签往左展开，避免出界
      el.classList.toggle('flip', th.bead.x > W * 0.68);
    }
  }

  /* ---------- 悬停判定 ---------- */

  function updateHover() {
    if (!pointer.active) { hovered = null; return; }

    let best = null;
    let bestD = 60;   // 命中半径

    for (const th of threads) {
      if (!th.link) continue;
      const d = Math.hypot(th.bead.x - pointer.x, th.bead.y - pointer.y);
      if (d < bestD) { bestD = d; best = th; }
    }

    hovered = best;
    canvas.style.cursor = best ? 'pointer' : '';
  }

  /* ---------- 主循环 ---------- */

  function frame(now) {
    if (running) {
      step(now);
      updateHover();
      render();
      placeLabels();
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
    build();
  }

  /* ---------- 输入 ---------- */

  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.active = true;
  }

  function onLeave() {
    pointer.active = false;
    pointer.x = -9999;
    pointer.y = -9999;
    hovered = null;
    canvas.style.cursor = '';
  }

  function onClick(e) {
    if (!hovered) return;
    const r = canvas.getBoundingClientRect();
    const d = Math.hypot(hovered.bead.x - (e.clientX - r.left), hovered.bead.y - (e.clientY - r.top));
    if (d < 60) window.location.href = hovered.link.href;
  }

  /* ---------- 启动 ---------- */

  resize();

  // 让线先垂下来再开始渲染，避免第一帧是一排点
  for (let i = 0; i < 140; i++) step(performance.now());

  if (reduced) {
    render();
    placeLabels();
    return () => {};
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const io = new IntersectionObserver(
    ([entry]) => { running = entry.isIntersecting; },
    { threshold: 0 }
  );
  io.observe(canvas);

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave, { passive: true });
  canvas.addEventListener('click', onClick);

  // 键盘：Tab 到某个作品时，对应的线也要亮起来
  for (const link of links) {
    link.el.addEventListener('focus', () => {
      focused = threads.find((th) => th.link === link) ?? null;
    });
    link.el.addEventListener('blur', () => { focused = null; });
  }

  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onMove);
    document.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('click', onClick);
  };
}
