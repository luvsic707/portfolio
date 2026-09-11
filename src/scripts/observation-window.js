/* ============================================================
   首屏：观察窗 —— Red Thread Rehab

   整屏是一块起了雾的玻璃。玻璃后面有一件标本，它在流动。
   你把光标划过去，那一块雾被擦开，底下的纤维才清晰；
   手一停，雾慢慢重新凝上来。
   红线的检定层画在玻璃这一面，所以永远是清楚的 ——
   仪器是硬的，标本是软的，中间隔着一层雾。

   为什么是这个：隔着观察窗看诊，先擦雾才能量。这是 rehab 本身。

   —— 三层，各自解决一个问题 ——

   流动：不再烘焙一张静止的图。几千个粒子在 flow field 里漂，
         画布每帧只淡一点点不清空，拖尾自己叠成纤维。
         场本身也在极缓地漂移，所以纤维会慢慢改道。

   材质：清晰层降采样再放大 = 磨砂；用降低的不透明度贴上去，
         纸色透上来就是雾。擦开的地方用遮罩露出原始的清晰层。

   交互：光标是橡皮，也是搅棒 —— 它在场里加一个涡流，
         纤维会被搅歪，松手后慢慢回到原来的走向。
         测距线只连接「当前已经擦干净」的测点。
   ============================================================ */

const RED = '196,22,50';
const INK = '58,52,58';

const PARTICLES = 2400;
const STEP = 1.5;               // 粒子每帧走多远
const TRAIL = 0.0075;           // 每帧把画布擦掉多少 —— 决定纤维有多长
const BRUSH_R = 100;            // 橡皮半径
const REFOG = 0.0065;           // 雾重新凝上来的速度
const STIR_R = 230;             // 搅动半径
const CALM_DELAY = 900;
const PX_PER_CM = 5.2;
const NODES = 6;

const GX = 44, GY = 26;         // 清晰度的粗网格，用来判断测点露没露出来

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------- 值噪声 ---------- */

const hash2 = (x, y, s) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 2246822519 | 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const smooth = (t) => t * t * (3 - 2 * t);

const vnoise = (x, y, s) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = smooth(x - xi), v = smooth(y - yi);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
};

const fbm = (x, y, s) =>
  vnoise(x, y, s) * 0.55 +
  vnoise(x * 2.1, y * 2.1, s + 7) * 0.29 +
  vnoise(x * 4.3, y * 4.3, s + 13) * 0.16;

/* 四个笔调。粒子生成时分进其中一桶，每帧每桶只 stroke 一次 ——
   两千多个粒子如果各描各的，光是 stroke 的调用开销就吃满一帧。 */
const BUCKETS = [
  { c: `rgba(${RED},0.06)`,  w: 0.55 },
  { c: `rgba(${RED},0.10)`,  w: 0.85 },
  { c: `rgba(${RED},0.155)`, w: 1.25 },
  { c: `rgba(${INK},0.075)`, w: 0.7 },
];

export function initObservationWindow(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1;
  let cx = 0, cy = 0, coreR = 0, span = 0;
  const fseed = Math.floor(rand(0, 9999));

  /* 三块离屏：清晰层、降采样用的小图、擦除遮罩 */
  let sharp = null, sctx = null;
  let small = null, mctx = null;
  let mask = null, kctx = null;
  let temp = null, tctx = null;
  let sw = 0, sh = 0;

  let parts = [];
  let nodes = [];
  let edges = [];

  /* 清晰度网格：擦一下就往上加，每帧整体衰减。
     只是为了判断测点露没露出来，不需要逐像素读回画布 —— 那太慢。 */
  let clarity = new Float32Array(GX * GY);
  let maxClear = 0;
  /* 只在擦过的范围里做「露出清晰层」的合成，不必整屏来一遍 */
  let rev = null;

  const pointer = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, down: false, active: false };
  let lastMove = -1e9;
  let stir = 0;
  let raf = 0;
  let t0 = 0;
  /* 纤维是靠拖尾一帧一帧叠出来的，冷启动要好几秒才看得见东西。
     开头几十帧每帧多跑几步，进场时就已经长好了。 */
  let warm = 0;

  /* ---------- 场 ----------
     纯噪声，不掺辐射项 —— 掺了所有线就从一个点炸出去，成一个毛球。
     形靠播种密度造，不靠场造。
     缓慢平移采样点，纤维就会慢慢改道，这是「流动」的来源之一。 */
  const flow = (x, y, t, out) => {
    const s = span * 0.5;
    const a = (fbm(x / s + t * 0.010, y / s - t * 0.006, fseed) - 0.5) * Math.PI * 4.4;
    let vx = Math.cos(a), vy = Math.sin(a);

    /* 光标的涡流。用向量混合，不做角度插值 —— 角度会在 ±π 处翻面，
       纤维就会突然掉头，看着像故障。 */
    if (stir > 0.01) {
      const dx = x - pointer.x, dy = y - pointer.y;
      const d = Math.hypot(dx, dy);
      if (d < STIR_R && d > 0.01) {
        const k = (1 - d / STIR_R) ** 2 * stir;
        const ox = dx / d, oy = dy / d;
        const tx = -oy, ty = ox;
        /* 力道要克制。搅得太狠，纤维会被整片扫空，
           要好几秒才长回来 —— 那不是搅动，是清场。 */
        const push = pointer.down ? 1.1 : 0;
        vx += tx * k * 0.9 + ox * k * push;
        vy += ty * k * 0.9 + oy * k * push;
      }
    }
    const m = Math.hypot(vx, vy) || 1;
    out[0] = vx / m;
    out[1] = vy / m;
  };

  /* ---------- 粒子 ---------- */

  const respawn = (p) => {
    const a = rand(0, Math.PI * 2);
    /* 幂次把绝大多数种子压进核里，尾巴甩得很远 ——
       一个密核加几缕散出去的，才是一件东西；均匀撒是一块布 */
    const t = Math.pow(Math.random(), 2.6);
    const r = coreR * 0.2 + t * span * 0.58;
    p.x = cx + Math.cos(a) * r * 1.05;
    p.y = cy + Math.sin(a) * r * 0.95;
    p.age = 0;
    p.life = rand(70, 300);
    const near = clamp01(1 - r / (span * 0.8));
    p.b = Math.random() < 0.1 ? 3 : near > 0.55 ? 2 : near > 0.25 ? 1 : 0;
  };

  /* ---------- 尺寸 ---------- */

  const mkCanvas = (w, h, scale) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (scale) g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [c, g];
  };

  const resize = () => {
    /* 每帧要做三次整屏合成，2 已经是能稳住 60 帧的上限 */
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    W = r.width; H = r.height;
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    canvas.width = pw; canvas.height = ph;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const narrow = W < 760;
    cx = narrow ? W * 0.52 : W * 0.64;
    cy = narrow ? H * 0.36 : H * 0.48;
    span = Math.min(W, H);
    coreR = span * (narrow ? 0.1 : 0.11);

    [sharp, sctx] = mkCanvas(pw, ph, true);
    sctx.lineCap = 'round';
    [mask, kctx] = mkCanvas(pw, ph, true);
    [temp, tctx] = mkCanvas(pw, ph, true);
    sw = Math.max(8, Math.round(pw / 6));
    sh = Math.max(8, Math.round(ph / 6));
    [small, mctx] = mkCanvas(sw, sh, false);
    mctx.imageSmoothingEnabled = true;
    mctx.imageSmoothingQuality = 'high';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    clarity = new Float32Array(GX * GY);
    maxClear = 0;
    rev = null;
    warm = 150;

    parts = [];
    for (let i = 0; i < PARTICLES; i++) {
      const p = { x: 0, y: 0, age: 0, life: 0, b: 0 };
      respawn(p);
      p.age = Math.random() * p.life;   // 错开寿命，否则整群会一起消失
      parts.push(p);
    }
    placeNodes();
    return true;
  };

  /* ---------- 测点 ----------
     固定几个点，落在标本身上、彼此离得开。
     它们不跟着粒子跑 —— 量距离的基准如果自己在动，就不是量了。 */
  const placeNodes = () => {
    nodes = [];
    for (let t = 0; t < 400 && nodes.length < NODES; t++) {
      const a = rand(0, Math.PI * 2);
      const r = coreR * 0.5 + Math.pow(Math.random(), 1.4) * span * 0.42;
      const x = cx + Math.cos(a) * r * 1.1;
      const y = cy + Math.sin(a) * r * 0.9;
      if (x < W * 0.07 || x > W * 0.95 || y < H * 0.1 || y > H * 0.9) continue;
      if (!nodes.every((p) => Math.hypot(p.x - x, p.y - y) > span * 0.22)) continue;
      nodes.push({ x, y });
    }
    buildEdges();
  };

  /* 最小生成树 + 一个三角：稀疏但连通，不会连成一张网 */
  const buildEdges = () => {
    edges = [];
    if (nodes.length < 2) return;
    const order = nodes
      .map((s, i) => ({ i, d: Math.hypot(s.x - cx, s.y - cy) }))
      .sort((a, b) => a.d - b.d)
      .map((o) => o.i);
    const net = new Set();
    const tri = order.slice(0, 3);
    for (let a = 0; a < tri.length; a++) {
      for (let b = a + 1; b < tri.length; b++) edges.push([tri[a], tri[b]]);
      net.add(tri[a]);
    }
    for (const i of order.slice(3)) {
      let best = -1, bd = Infinity;
      for (const j of net) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        if (d < bd) { bd = d; best = j; }
      }
      if (best >= 0) edges.push([i, best]);
      net.add(i);
    }
  };

  /* ---------- 擦雾 ---------- */

  const gridAt = (x, y) => {
    const gx = Math.floor((x / W) * GX);
    const gy = Math.floor((y / H) * GY);
    if (gx < 0 || gx >= GX || gy < 0 || gy >= GY) return 0;
    return clarity[gy * GX + gx];
  };

  const stamp = (x, y) => {
    const g = kctx.createRadialGradient(x, y, 0, x, y, BRUSH_R);
    g.addColorStop(0, 'rgba(255,255,255,0.5)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.28)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    kctx.globalCompositeOperation = 'lighter';
    kctx.fillStyle = g;
    kctx.beginPath();
    kctx.arc(x, y, BRUSH_R, 0, 6.283);
    kctx.fill();

    /* 同步那张粗网格 */
    const r2 = BRUSH_R * BRUSH_R;
    for (let gy = 0; gy < GY; gy++) {
      for (let gx = 0; gx < GX; gx++) {
        const px = ((gx + 0.5) / GX) * W, py = ((gy + 0.5) / GY) * H;
        const d2 = (px - x) ** 2 + (py - y) ** 2;
        if (d2 > r2) continue;
        const i = gy * GX + gx;
        clarity[i] = Math.min(1, clarity[i] + 0.5 * (1 - Math.sqrt(d2) / BRUSH_R));
      }
    }

    const pad = BRUSH_R + 4;
    if (!rev) rev = { x0: x - pad, y0: y - pad, x1: x + pad, y1: y + pad };
    else {
      rev.x0 = Math.min(rev.x0, x - pad); rev.y0 = Math.min(rev.y0, y - pad);
      rev.x1 = Math.max(rev.x1, x + pad); rev.y1 = Math.max(rev.y1, y + pad);
    }
  };

  /* 两帧之间指针可能跳很远，中间要补上，否则擦出来是一串断点 */
  const wipe = () => {
    const dx = pointer.x - pointer.px, dy = pointer.y - pointer.py;
    const d = Math.hypot(dx, dy);
    const n = Math.max(1, Math.min(24, Math.ceil(d / 14)));
    for (let i = 1; i <= n; i++) {
      stamp(pointer.px + (dx * i) / n, pointer.py + (dy * i) / n);
    }
    pointer.px = pointer.x;
    pointer.py = pointer.y;
  };

  /* ---------- 每帧 ---------- */

  const v = [0, 0];

  const advect = (t) => {
    /* 不清空，只淡一点点 —— 拖尾叠起来就是纤维。
       清空的话每帧只剩一堆孤立的小段，那是噪点。 */
    sctx.globalCompositeOperation = 'destination-out';
    sctx.fillStyle = `rgba(0,0,0,${TRAIL})`;
    sctx.fillRect(0, 0, W, H);
    sctx.globalCompositeOperation = 'source-over';

    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const lim = span * 0.72;
    for (const p of parts) {
      const ox = p.x, oy = p.y;
      flow(p.x, p.y, t, v);
      p.x += v[0] * STEP;
      p.y += v[1] * STEP;
      p.age++;
      if (p.age > p.life ||
          Math.hypot(p.x - cx, p.y - cy) > lim ||
          p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) {
        respawn(p);
        continue;
      }
      const pa = paths[p.b];
      pa.moveTo(ox, oy);
      pa.lineTo(p.x, p.y);
    }
    for (let i = 0; i < 4; i++) {
      sctx.strokeStyle = BUCKETS[i].c;
      sctx.lineWidth = BUCKETS[i].w;
      sctx.stroke(paths[i]);
    }
  };

  const draw = (t) => {
    ctx.clearRect(0, 0, W, H);

    /* 磨砂：清晰层降到 1/6 再放回全屏，双线性升采样就是漫射；
       再压低不透明度，纸色透上来就是雾。 */
    mctx.clearRect(0, 0, sw, sh);
    mctx.drawImage(sharp, 0, 0, sw, sh);
    ctx.globalCompositeOperation = 'multiply';
    /* 雾要压得很薄。厚了整屏就是一片粉，既没有留白也不冷；
       薄了未擦的地方只剩一个淡影，擦开才有反差。 */
    ctx.globalAlpha = 0.34;
    ctx.drawImage(small, 0, 0, W, H);
    ctx.globalAlpha = 1;

    /* 擦开的地方露出原始的清晰层。只在擦过的矩形里做。 */
    if (rev && maxClear > 0.02) {
      const x0 = Math.max(0, rev.x0), y0 = Math.max(0, rev.y0);
      const x1 = Math.min(W, rev.x1), y1 = Math.min(H, rev.y1);
      const w = x1 - x0, h = y1 - y0;
      if (w > 1 && h > 1) {
        tctx.clearRect(x0, y0, w, h);
        tctx.globalCompositeOperation = 'source-over';
        tctx.drawImage(sharp, x0 * dpr, y0 * dpr, w * dpr, h * dpr, x0, y0, w, h);
        tctx.globalCompositeOperation = 'destination-in';
        tctx.drawImage(mask, x0 * dpr, y0 * dpr, w * dpr, h * dpr, x0, y0, w, h);
        ctx.drawImage(temp, x0 * dpr, y0 * dpr, w * dpr, h * dpr, x0, y0, w, h);
      }
    }

    ctx.globalCompositeOperation = 'source-over';

    /* 红线画在玻璃这一面，所以永远清楚 */
    for (const nd of nodes) {
      const c = clamp01(gridAt(nd.x, nd.y) * 1.6);
      if (c < 0.04) continue;
      ctx.strokeStyle = `rgba(${RED},${0.55 * c})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, 2.6, 0, 6.283);
      ctx.stroke();
    }

    /* 一条尺寸线只有在两端都擦干净了才成立 ——
       量没看见的东西，那不是量，是编 */
    for (const [i, j] of edges) {
      const a = nodes[i], b = nodes[j];
      const c = Math.min(clamp01(gridAt(a.x, a.y) * 1.6), clamp01(gridAt(b.x, b.y) * 1.6));
      thread(a.x, a.y, b.x, b.y, 8, 8, c * 0.95,
             `${Math.round(Math.hypot(b.x - a.x, b.y - a.y) / PX_PER_CM)}cm`);
    }

    /* 光标本身是一个活动的测点 */
    if (stir > 0.02) {
      ctx.strokeStyle = `rgba(${RED},${0.85 * stir})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, BRUSH_R * 0.34, 0, 6.283);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pointer.x - 7, pointer.y); ctx.lineTo(pointer.x + 7, pointer.y);
      ctx.moveTo(pointer.x, pointer.y - 7); ctx.lineTo(pointer.x, pointer.y + 7);
      ctx.stroke();

      const near = nodes
        .map((s) => ({ s, d: Math.hypot(s.x - pointer.x, s.y - pointer.y) }))
        .sort((p, q) => p.d - q.d)
        .slice(0, 2);
      for (const { s, d } of near) {
        thread(pointer.x, pointer.y, s.x, s.y, BRUSH_R * 0.34, 8, stir * 0.9,
               `${Math.round(d / PX_PER_CM)}cm`);
      }
    }
  };

  const thread = (ax, ay, bx, by, ta, tb, alpha, label) => {
    if (alpha <= 0.02) return;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < ta + tb + 26) return;
    const ux = dx / len, uy = dy / len;
    const x0 = ax + ux * ta, y0 = ay + uy * ta;
    const x1 = bx - ux * tb, y1 = by - uy * tb;

    ctx.strokeStyle = `rgba(${RED},${0.82 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.stroke();

    /* 端点刻度垂直于线 —— 这一笔才让它从「连线」变成「尺寸线」 */
    const px = -uy * 4.5, py = ux * 4.5;
    ctx.beginPath();
    ctx.moveTo(x0 - px, y0 - py); ctx.lineTo(x0 + px, y0 + py);
    ctx.moveTo(x1 - px, y1 - py); ctx.lineTo(x1 + px, y1 + py);
    ctx.stroke();

    if (!label) return;
    let a = Math.atan2(uy, ux);
    if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;   // 字不能倒着
    ctx.save();
    ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
    ctx.rotate(a);
    ctx.font = '10px "Fragment Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(label).width;
    ctx.fillStyle = `rgba(247,248,247,${0.88 * alpha})`;
    ctx.fillRect(-w / 2 - 3, -6, w + 6, 12);
    ctx.fillStyle = `rgba(${RED},${0.95 * alpha})`;
    ctx.fillText(label, 0, 0.5);
    ctx.restore();
  };

  /* ---------- 主循环 ---------- */

  const frame = (now) => {
    if (!t0) t0 = now;
    const t = (now - t0) / 1000;
    const calm = now - lastMove > CALM_DELAY;
    stir += ((pointer.active && !calm ? 1 : 0) - stir) * 0.08;

    if (pointer.active && !calm) wipe();

    /* 雾重新凝上来：遮罩和粗网格一起衰减。
       遮罩只在擦过的范围里衰减，不必整屏来一遍。 */
    if (rev) {
      const x0 = Math.max(0, rev.x0), y0 = Math.max(0, rev.y0);
      const x1 = Math.min(W, rev.x1), y1 = Math.min(H, rev.y1);
      kctx.globalCompositeOperation = 'destination-out';
      kctx.fillStyle = `rgba(0,0,0,${REFOG})`;
      kctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    maxClear = 0;
    for (let i = 0; i < clarity.length; i++) {
      clarity[i] *= 1 - REFOG;
      if (clarity[i] > maxClear) maxClear = clarity[i];
    }
    if (maxClear < 0.02) rev = null;

    const iters = warm > 0 ? 4 : 1;
    warm -= iters;
    for (let i = 0; i < iters; i++) advect(t);
    draw(t);
    raf = requestAnimationFrame(frame);
  };

  /* ---------- 交互 ---------- */

  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = e.clientX - r.left, ny = e.clientY - r.top;
    if (!pointer.active) { pointer.px = nx; pointer.py = ny; }
    pointer.x = nx; pointer.y = ny;
  };

  canvas.addEventListener('pointermove', (e) => {
    toLocal(e);
    pointer.active = true;
    lastMove = performance.now();
  });
  canvas.addEventListener('pointerdown', (e) => {
    toLocal(e);
    pointer.down = true;
    pointer.active = true;
    lastMove = performance.now();
    canvas.setPointerCapture?.(e.pointerId);
  });
  const release = () => { pointer.down = false; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => {
    pointer.down = false;
    pointer.active = false;
  });

  /* ---------- 启动 ---------- */

  let started = false;

  const start = () => {
    if (!resize()) return;
    if (reduced) {
      /* 尊重系统设置：跑够让纤维长出来的帧数，然后停在那一张 */
      for (let i = 0; i < 220; i++) advect(i / 60);
      draw(0);
    } else if (!raf) {
      raf = requestAnimationFrame(frame);
    }
    started = true;
  };

  start();

  let rt = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (!started) { start(); return; }
      const b = { w: W, h: H };
      if (!resize()) return;
      if (Math.abs(W - b.w) < 2 && Math.abs(H - b.h) < 2) return;
      if (reduced) { for (let i = 0; i < 220; i++) advect(i / 60); draw(0); }
    }, 200);
  });
  ro.observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (reduced) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { t0 = 0; raf = requestAnimationFrame(frame); }
  });
}
