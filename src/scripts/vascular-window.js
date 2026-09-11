/* ============================================================
   首屏：观察窗 —— Red Thread Rehab

   三块玻璃，各画各的，顺序就是概念本身：

     标本（下）  一张长满整屏的血管床，血在里面走
     玻璃（中）  起了雾的窗。你擦哪儿，哪儿破一个洞
     仪器（上）  红线卡尺。只量已经擦干净、看得见的地方

   —— 为什么是血管 ——

   前一版背景是随机纤维，看着热闹但什么也不是。
   Red Thread 本来就是血管：红色的线、有主干有分支、
   医学的正题。血管自带层级（主干粗、末梢细），
   自带留白（血管床本来就是疏密不均的），
   而且分叉点是解剖学上真正会去量的地标 —— 量它才叫量。

   血管用空间殖民算法长出来（Runions 的叶脉算法）：
   先在整屏撒下「生长素」，每个生长素吸引最近的节点，
   节点朝着吸引它的那些的平均方向长一小截，走到跟前就把生长素吃掉。
   长完按达芬奇分叉律（父枝截面 = 子枝截面之和）从末梢回推粗细。

   —— 为什么雾要用位移不用模糊 ——

   真磨砂玻璃是折射：表面的粗糙把光推歪，所以你看到的是
   被局部推移过的背后，不是被均匀抹开的背后。
   纯高斯模糊没有透镜效应，一眼就假。
   这里用 SVG 的 feTurbulence + feDisplacementMap 挂在玻璃层上，
   浏览器拿 GPU 做。附带的好处是：擦出来的洞口边缘
   也会被同一个湍流打碎，所以擦痕是毛的、是湿的，不是一个圆。
   ============================================================ */

const RED = '196,22,50';
const DEEP = '150,16,42';

const ATTRACTORS = 4200;        // 生长素
const ATTRACT_D = 115;          // 吸引半径
const KILL_D = 12;              // 走到这么近就把生长素吃掉
const SEG = 7;                  // 每次长多长
const MAX_NODES = 6200;
const GROW_PER_FRAME = 16;

const PULSES = 80;              // 搏动
const PULSE_SPEED = 1.9;

const BRUSH_R = 104;
const REFOG = 0.0055;
const LANDMARKS = 14;
const PX_PER_CM = 5.2;
const CALM_DELAY = 900;

const GX = 52, GY = 32;         // 清晰度的粗网格

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------- 值噪声：只用来让生长素疏密不均 ---------- */

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

export function initVascularWindow(elSpec, elGlass, elTool) {
  const spec = elSpec.getContext('2d');       // 标本
  const glass = elGlass.getContext('2d');     // 玻璃
  const tool = elTool.getContext('2d');       // 仪器
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1;
  const nseed = Math.floor(rand(0, 9999));

  /* 血管：平铺数组，长出来之后就不动了 */
  let nx = null, ny = null, npar = null, nw = null;
  let kids = [];
  let count = 0;
  let roots = [];

  let attr = [];                 // 剩下的生长素
  let cell = 0;
  let gridMap = new Map();       // 节点的空间索引，不然每次生长都是 O(A×N)
  let growing = true;

  let baked = null, bctx = null; // 血管画一次就存着
  let mask = null, kctx = null;  // 擦除遮罩
  let pulses = [];
  let marks = [];                // 地标：分叉点

  let clarity = new Float32Array(GX * GY);
  let maxClear = 0;
  let rev = null;                // 擦过的包围盒

  const ptr = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, down: false, active: false };
  let lastMove = -1e9;
  let live = 0;
  let raf = 0;

  /* ---------- 空间索引 ---------- */

  const key = (x, y) => ((y / cell) | 0) * 100000 + ((x / cell) | 0);

  const addToGrid = (i) => {
    const k = key(nx[i], ny[i]);
    let a = gridMap.get(k);
    if (!a) { a = []; gridMap.set(k, a); }
    a.push(i);
  };

  /* 只在邻近九格里找最近的节点。不这么做的话，
     四千个生长素 × 几千个节点，每一步都是千万次比较。 */
  const nearestNode = (x, y) => {
    const gx = (x / cell) | 0, gy = (y / cell) | 0;
    let best = -1, bd = ATTRACT_D * ATTRACT_D;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const a = gridMap.get((gy + dy) * 100000 + (gx + dx));
        if (!a) continue;
        for (const i of a) {
          const d = (nx[i] - x) ** 2 + (ny[i] - y) ** 2;
          if (d < bd) { bd = d; best = i; }
        }
      }
    }
    return best;
  };

  /* ---------- 播种 ---------- */

  const seed = () => {
    nx = new Float32Array(MAX_NODES);
    ny = new Float32Array(MAX_NODES);
    npar = new Int32Array(MAX_NODES).fill(-1);
    nw = new Float32Array(MAX_NODES);
    kids = [];
    count = 0;
    roots = [];
    gridMap = new Map();
    cell = ATTRACT_D;
    growing = true;

    /* 生长素铺满整屏，疏密由一张低频噪声决定 ——
       均匀撒的话血管床会像一块布，有疏有密才是组织，
       而且疏的地方正好成了留白。 */
    attr = [];
    const s = Math.min(W, H);
    let guard = 0;
    while (attr.length < ATTRACTORS && guard < ATTRACTORS * 8) {
      guard++;
      const x = rand(-W * 0.06, W * 1.06);
      const y = rand(-H * 0.06, H * 1.06);
      const d = vnoise(x / (s * 0.42), y / (s * 0.42), nseed);
      if (Math.random() > 0.2 + d * 1.15) continue;
      attr.push(x, y);
    }

    /* 几条主干从画面外进来，向里长。
       从一个点往外长会得到一朵花；从边上进来才是一张床。 */
    const entries = W < 760
      ? [[W * 0.5, H * 1.05], [W * 0.05, H * 0.25], [W * 0.98, H * 0.6]]
      : [[W * 1.04, H * 0.62], [W * 0.34, H * 1.05], [W * 0.9, H * -0.05], [W * -0.04, H * 0.4]];
    for (const [x, y] of entries) {
      const i = count++;
      nx[i] = x; ny[i] = y; npar[i] = -1; kids[i] = [];
      addToGrid(i);
      roots.push(i);
    }
  };

  /* ---------- 生长 ---------- */

  const growStep = () => {
    if (count >= MAX_NODES || attr.length === 0) { growing = false; return; }

    /* 每个生长素把自己的方向投给最近的节点 */
    const dirX = new Map(), dirY = new Map();
    for (let a = 0; a < attr.length; a += 2) {
      const i = nearestNode(attr[a], attr[a + 1]);
      if (i < 0) continue;
      let dx = attr[a] - nx[i], dy = attr[a + 1] - ny[i];
      const m = Math.hypot(dx, dy) || 1;
      dirX.set(i, (dirX.get(i) || 0) + dx / m);
      dirY.set(i, (dirY.get(i) || 0) + dy / m);
    }
    if (dirX.size === 0) { growing = false; return; }

    const fresh = [];
    for (const [i, sx] of dirX) {
      if (count >= MAX_NODES) break;
      const sy = dirY.get(i);
      let m = Math.hypot(sx, sy);
      if (m < 1e-6) continue;
      /* 加一点抖动，笔直的分叉看着像电路板不像血管 */
      const ux = sx / m + rand(-0.16, 0.16);
      const uy = sy / m + rand(-0.16, 0.16);
      m = Math.hypot(ux, uy) || 1;
      const j = count++;
      nx[j] = nx[i] + (ux / m) * SEG;
      ny[j] = ny[i] + (uy / m) * SEG;
      npar[j] = i;
      kids[j] = [];
      kids[i].push(j);
      addToGrid(j);
      fresh.push(j);
    }

    /* 走到跟前的生长素被吃掉 */
    const kill = KILL_D * KILL_D;
    const keep = [];
    for (let a = 0; a < attr.length; a += 2) {
      const i = nearestNode(attr[a], attr[a + 1]);
      if (i >= 0 && (nx[i] - attr[a]) ** 2 + (ny[i] - attr[a + 1]) ** 2 < kill) continue;
      keep.push(attr[a], attr[a + 1]);
    }
    attr = keep;

    /* 新长出来的那一截当场画掉，不必每帧重画整棵 */
    for (const j of fresh) drawSeg(j, 0.55);
    if (attr.length === 0 || count >= MAX_NODES) finishGrow();
  };

  /* 达芬奇分叉律：父枝的截面等于子枝截面之和。
     从末梢往回推，主干自然就粗起来 —— 这是「有层级」的来源，
     手动分配粗细永远会露馅。 */
  const finishGrow = () => {
    growing = false;
    for (let i = 0; i < count; i++) nw[i] = kids[i].length === 0 ? 0.55 : 0;
    for (let i = count - 1; i >= 0; i--) {
      if (kids[i].length) {
        let s = 0;
        for (const k of kids[i]) s += Math.pow(nw[k], 2.4);
        nw[i] = Math.pow(s, 1 / 2.4);
      }
      const p = npar[i];
      if (p >= 0 && nw[i] === 0) nw[i] = 0.55;
    }
    /* 粗细定了才重画一遍，这次是完整的一棵 */
    bctx.clearRect(0, 0, W, H);
    for (let i = 0; i < count; i++) if (npar[i] >= 0) drawSeg(i, 1);
    placeMarks();
    seedPulses();
  };

  const drawSeg = (i, k) => {
    const p = npar[i];
    if (p < 0) return;
    const w = Math.min(4.2, (nw[i] || 0.55));
    bctx.strokeStyle = w > 1.6
      ? `rgba(${DEEP},${0.66 * k})`
      : `rgba(${RED},${(0.34 + w * 0.2) * k})`;
    bctx.lineWidth = w;
    bctx.beginPath();
    bctx.moveTo(nx[p], ny[p]);
    bctx.lineTo(nx[i], ny[i]);
    bctx.stroke();
  };

  /* ---------- 地标 ----------
     只取分叉点，而且要够粗 —— 量两根毛细血管之间的距离没有意义，
     量主干的分叉才是解剖学上真会做的事。 */
  const placeMarks = () => {
    marks = [];
    const cands = [];
    for (let i = 0; i < count; i++) {
      if (kids[i].length < 2 || nw[i] < 1.15) continue;
      if (nx[i] < W * 0.04 || nx[i] > W * 0.96 || ny[i] < H * 0.05 || ny[i] > H * 0.95) continue;
      cands.push(i);
    }
    cands.sort((a, b) => nw[b] - nw[a]);
    const sep = Math.min(W, H) * 0.17;
    for (const i of cands) {
      if (marks.length >= LANDMARKS) break;
      if (marks.every((m) => Math.hypot(m.x - nx[i], m.y - ny[i]) > sep)) {
        marks.push({ x: nx[i], y: ny[i], w: nw[i] });
      }
    }
  };

  /* ---------- 搏动 ---------- */

  const seedPulses = () => {
    pulses = [];
    for (let i = 0; i < PULSES; i++) pulses.push(newPulse(Math.random()));
  };

  const newPulse = (t) => {
    const a = roots[(Math.random() * roots.length) | 0];
    const k = kids[a] && kids[a].length ? kids[a][(Math.random() * kids[a].length) | 0] : -1;
    return { i: a, j: k, t, v: rand(0.75, 1.3) };
  };

  const stepPulses = () => {
    for (let n = 0; n < pulses.length; n++) {
      const p = pulses[n];
      if (p.j < 0) { pulses[n] = newPulse(0); continue; }
      p.t += (PULSE_SPEED * p.v) / SEG;
      while (p.t >= 1) {
        p.t -= 1;
        p.i = p.j;
        const k = kids[p.i];
        /* 到了末梢就回根上重新出发 —— 血是循环的 */
        if (!k || !k.length) { pulses[n] = newPulse(0); break; }
        p.j = k[(Math.random() * k.length) | 0];
      }
    }
  };

  /* ---------- 尺寸 ---------- */

  const mk = (pw, ph) => {
    const c = document.createElement('canvas');
    c.width = pw; c.height = ph;
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [c, g];
  };

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = elSpec.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    W = r.width; H = r.height;
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    for (const el of [elSpec, elGlass, elTool]) { el.width = pw; el.height = ph; }
    for (const g of [spec, glass, tool]) {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.lineCap = 'round';
      g.lineJoin = 'round';
    }
    [baked, bctx] = mk(pw, ph);
    bctx.lineCap = 'round';
    [mask, kctx] = mk(pw, ph);

    clarity = new Float32Array(GX * GY);
    maxClear = 0;
    rev = null;
    seed();
    return true;
  };

  /* ---------- 擦雾 ---------- */

  const gridAt = (x, y) => {
    const gx = ((x / W) * GX) | 0, gy = ((y / H) * GY) | 0;
    if (gx < 0 || gx >= GX || gy < 0 || gy >= GY) return 0;
    return clarity[gy * GX + gx];
  };

  /* 一次擦拭不是一个圆。手指按在玻璃上是一块不规则的接触面，
     而且会顺着走的方向拖出一道。所以下笔是一小撮偏心的斑，
     加一道顺着运动方向的长斑 —— 洞口的形状由它们决定，
     再交给玻璃层的湍流把边打碎。 */
  const blot = (x, y, r, a) => {
    const g = kctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.6, `rgba(255,255,255,${a * 0.5})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    kctx.fillStyle = g;
    kctx.beginPath();
    kctx.arc(x, y, r, 0, 6.283);
    kctx.fill();
  };

  const stamp = (x, y, dx, dy) => {
    kctx.globalCompositeOperation = 'lighter';
    blot(x, y, BRUSH_R * 0.72, 0.34);
    for (let i = 0; i < 4; i++) {
      const a = rand(0, 6.283), d = rand(0.2, 0.8) * BRUSH_R * 0.6;
      blot(x + Math.cos(a) * d, y + Math.sin(a) * d, BRUSH_R * rand(0.3, 0.55), rand(0.1, 0.24));
    }
    /* 拖痕 */
    const m = Math.hypot(dx, dy);
    if (m > 2) {
      const ux = dx / m, uy = dy / m;
      for (let i = 1; i <= 3; i++) {
        blot(x - ux * i * BRUSH_R * 0.3, y - uy * i * BRUSH_R * 0.3,
             BRUSH_R * (0.45 - i * 0.08), 0.14);
      }
    }

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

    const pad = BRUSH_R + 10;
    if (!rev) rev = { x0: x - pad, y0: y - pad, x1: x + pad, y1: y + pad };
    else {
      rev.x0 = Math.min(rev.x0, x - pad); rev.y0 = Math.min(rev.y0, y - pad);
      rev.x1 = Math.max(rev.x1, x + pad); rev.y1 = Math.max(rev.y1, y + pad);
    }
  };

  /* 两帧之间指针可能跳很远，中间要补上，否则擦出来是一串断点 */
  const wipe = () => {
    const dx = ptr.x - ptr.px, dy = ptr.y - ptr.py;
    const d = Math.hypot(dx, dy);
    const n = Math.max(1, Math.min(20, Math.ceil(d / 18)));
    for (let i = 1; i <= n; i++) {
      stamp(ptr.px + (dx * i) / n, ptr.py + (dy * i) / n, dx, dy);
    }
    ptr.px = ptr.x; ptr.py = ptr.y;
  };

  /* ---------- 仪器 ---------- */

  const thread = (ax, ay, bx, by, ta, tb, alpha, label) => {
    if (alpha <= 0.02) return;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < ta + tb + 26) return;
    const ux = dx / len, uy = dy / len;
    const x0 = ax + ux * ta, y0 = ay + uy * ta;
    const x1 = bx - ux * tb, y1 = by - uy * tb;

    tool.strokeStyle = `rgba(${RED},${0.8 * alpha})`;
    tool.lineWidth = 1;
    tool.beginPath();
    tool.moveTo(x0, y0); tool.lineTo(x1, y1);
    tool.stroke();

    /* 端点刻度垂直于线 —— 这一笔才让它从「连线」变成「尺寸线」 */
    const px = -uy * 4.5, py = ux * 4.5;
    tool.beginPath();
    tool.moveTo(x0 - px, y0 - py); tool.lineTo(x0 + px, y0 + py);
    tool.moveTo(x1 - px, y1 - py); tool.lineTo(x1 + px, y1 + py);
    tool.stroke();

    if (!label) return;
    let a = Math.atan2(uy, ux);
    if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;   // 字不能倒着
    tool.save();
    tool.translate((x0 + x1) / 2, (y0 + y1) / 2);
    tool.rotate(a);
    tool.font = '10px "Fragment Mono", ui-monospace, monospace';
    tool.textAlign = 'center';
    tool.textBaseline = 'middle';
    const w = tool.measureText(label).width;
    tool.fillStyle = `rgba(247,248,247,${0.85 * alpha})`;
    tool.fillRect(-w / 2 - 3, -6, w + 6, 12);
    tool.fillStyle = `rgba(${RED},${0.95 * alpha})`;
    tool.fillText(label, 0, 0.5);
    tool.restore();
  };

  /* 每帧重新在「当前看得见的地标」上现搭一张最小生成树。
     擦开得越多，量得越多；雾回来了，量的就撤掉。
     用固定的一张网就没有这个 —— 卡尺是跟着你走的，不是画好的。 */
  const drawInstrument = (now) => {
    tool.clearRect(0, 0, W, H);
    if (growing) return;

    const vis = [];
    for (const m of marks) {
      const c = clamp01(gridAt(m.x, m.y) * 1.7);
      if (c > 0.05) vis.push({ m, c });
    }

    for (const { m, c } of vis) {
      tool.strokeStyle = `rgba(${RED},${0.6 * c})`;
      tool.lineWidth = 1;
      tool.beginPath();
      tool.arc(m.x, m.y, 3, 0, 6.283);
      tool.stroke();
    }

    if (vis.length > 1) {
      const used = [0];
      const left = vis.map((_, i) => i).slice(1);
      while (left.length) {
        let bi = 0, bj = 0, bd = Infinity;
        for (let a = 0; a < used.length; a++) {
          for (let b = 0; b < left.length; b++) {
            const p = vis[used[a]].m, q = vis[left[b]].m;
            const d = Math.hypot(p.x - q.x, p.y - q.y);
            if (d < bd) { bd = d; bi = used[a]; bj = b; }
          }
        }
        const j = left.splice(bj, 1)[0];
        const p = vis[bi], q = vis[j];
        used.push(j);
        thread(p.m.x, p.m.y, q.m.x, q.m.y, 9, 9,
               Math.min(p.c, q.c) * 0.95, `${Math.round(bd / PX_PER_CM)}cm`);
      }
    }

    if (live > 0.02) {
      /* 光标本身是卡尺的一端 */
      tool.strokeStyle = `rgba(${RED},${0.85 * live})`;
      tool.lineWidth = 1;
      tool.beginPath();
      tool.arc(ptr.x, ptr.y, BRUSH_R * 0.3, 0, 6.283);
      tool.stroke();
      tool.beginPath();
      tool.moveTo(ptr.x - 7, ptr.y); tool.lineTo(ptr.x + 7, ptr.y);
      tool.moveTo(ptr.x, ptr.y - 7); tool.lineTo(ptr.x, ptr.y + 7);
      tool.stroke();

      const near = vis
        .map((v) => ({ v, d: Math.hypot(v.m.x - ptr.x, v.m.y - ptr.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { v, d } of near) {
        thread(ptr.x, ptr.y, v.m.x, v.m.y, BRUSH_R * 0.3, 9, live * v.c,
               `${Math.round(d / PX_PER_CM)}cm`);
      }
      /* 角度：真卡尺会读角，而且这一笔让仪器层不只是一堆直线 */
      if (near.length === 2) {
        const a1 = Math.atan2(near[0].v.m.y - ptr.y, near[0].v.m.x - ptr.x);
        const a2 = Math.atan2(near[1].v.m.y - ptr.y, near[1].v.m.x - ptr.x);
        let da = Math.abs(a1 - a2);
        if (da > Math.PI) da = Math.PI * 2 - da;
        const rr = BRUSH_R * 0.52;
        tool.strokeStyle = `rgba(${RED},${0.45 * live})`;
        tool.beginPath();
        tool.arc(ptr.x, ptr.y, rr, Math.min(a1, a2), Math.max(a1, a2));
        tool.stroke();
        tool.font = '9px "Fragment Mono", ui-monospace, monospace';
        tool.fillStyle = `rgba(${RED},${0.8 * live})`;
        tool.textAlign = 'center';
        tool.fillText(`${Math.round((da * 180) / Math.PI)}°`,
                      ptr.x + Math.cos((a1 + a2) / 2) * (rr + 10),
                      ptr.y + Math.sin((a1 + a2) / 2) * (rr + 10));
      }
    }
  };

  /* ---------- 每帧 ---------- */

  const render = (now) => {
    /* 标本层：血管 + 走在里面的血 */
    spec.clearRect(0, 0, W, H);
    spec.globalCompositeOperation = 'multiply';
    spec.drawImage(baked, 0, 0, W, H);
    if (!growing) {
      stepPulses();
      for (const p of pulses) {
        if (p.j < 0) continue;
        const x = nx[p.i] + (nx[p.j] - nx[p.i]) * p.t;
        const y = ny[p.i] + (ny[p.j] - ny[p.i]) * p.t;
        const w = Math.min(4.4, nw[p.j] || 0.6);
        spec.strokeStyle = `rgba(${DEEP},0.5)`;
        spec.lineWidth = w * 1.25;
        spec.beginPath();
        spec.moveTo(nx[p.i] + (nx[p.j] - nx[p.i]) * Math.max(0, p.t - 0.55),
                    ny[p.i] + (ny[p.j] - ny[p.i]) * Math.max(0, p.t - 0.55));
        spec.lineTo(x, y);
        spec.stroke();
      }
    }
    spec.globalCompositeOperation = 'source-over';

    /* 玻璃层：一层纸色的雾 + 一份透过去的标本，
       然后按遮罩挖洞。整层交给 CSS 上的湍流位移滤镜，
       所以雾是折射的，洞口的边也是毛的。 */
    glass.globalCompositeOperation = 'source-over';
    glass.clearRect(0, 0, W, H);
    /* 雾要够厚，擦开才有反差；但不能厚到雾态是一片空白 ——
       整屏都得是活的，没擦的地方也要看得见血管的影子。 */
    glass.fillStyle = 'rgba(247,248,247,0.86)';
    glass.fillRect(0, 0, W, H);
    glass.globalAlpha = 0.42;
    glass.drawImage(elSpec, 0, 0, W, H);
    glass.globalAlpha = 1;
    if (rev && maxClear > 0.02) {
      const x0 = Math.max(0, rev.x0), y0 = Math.max(0, rev.y0);
      const x1 = Math.min(W, rev.x1), y1 = Math.min(H, rev.y1);
      glass.globalCompositeOperation = 'destination-out';
      glass.drawImage(mask, x0 * dpr, y0 * dpr, (x1 - x0) * dpr, (y1 - y0) * dpr,
                      x0, y0, x1 - x0, y1 - y0);
      glass.globalCompositeOperation = 'source-over';
    }

    drawInstrument(now);
  };

  const frame = (now) => {
    const calm = now - lastMove > CALM_DELAY;
    live += ((ptr.active && !calm ? 1 : 0) - live) * 0.1;
    if (ptr.active && !calm) wipe();

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

    if (growing) for (let i = 0; i < GROW_PER_FRAME && growing; i++) growStep();
    render(now);
    raf = requestAnimationFrame(frame);
  };

  /* ---------- 交互 ---------- */

  const toLocal = (e) => {
    const r = elTool.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (!ptr.active) { ptr.px = x; ptr.py = y; }
    ptr.x = x; ptr.y = y;
  };

  elTool.addEventListener('pointermove', (e) => {
    toLocal(e); ptr.active = true; lastMove = performance.now();
  });
  elTool.addEventListener('pointerdown', (e) => {
    toLocal(e); ptr.down = true; ptr.active = true; lastMove = performance.now();
    elTool.setPointerCapture?.(e.pointerId);
  });
  const release = () => { ptr.down = false; };
  elTool.addEventListener('pointerup', release);
  elTool.addEventListener('pointercancel', release);
  elTool.addEventListener('pointerleave', () => { ptr.down = false; ptr.active = false; });

  /* ---------- 启动 ---------- */

  let started = false;

  const start = () => {
    if (!resize()) return;
    if (reduced) {
      while (growing) growStep();
      render(0);
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
      if (reduced) { while (growing) growStep(); render(0); }
    }, 220);
  });
  ro.observe(elTool);

  document.addEventListener('visibilitychange', () => {
    if (reduced) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) raf = requestAnimationFrame(frame);
  });
}
