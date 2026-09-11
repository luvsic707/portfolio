/* ============================================================
   首屏：红线检定台 —— Red Thread Rehab

   整屏是一张检验台。几件说不清是什么的标本散在台上，
   红线把它们两两量起来，线上标着 cm。
   指针进场就是在量：红线跟着指针重新三角测量；
   停手一会儿，测量线收掉，标本漂回原位，台面恢复安静。

   —— 两种材质硬碰硬，这是全部的美术逻辑：
      标本是软的（磨砂、色散、没有一条硬边），
      红线是硬的（1px、正红、带端点刻度和字号很小的等宽标注）。
      少了任何一边都不成立：只有软的是一摊颜色，
      只有硬的是一张工程图。

   磨砂的做法不是画模糊，是烘焙在低分辨率上再放大 ——
   双线性升采样本身就是最自然的漫射，而且每帧只是一次 drawImage。
   色散的做法是暖冷两层各自偏移几像素再相乘：
   重叠处压成深紫，边缘各自漏出暖橙和青绿。
   ============================================================ */

const RED = '200,16,46';
const INK = '16,19,20';
const PAPER = '247,248,247';

const SPECIMENS = 9;
const WASH_LO = 5;              // 底色那一层的降采样倍数，只有它是糊的
const CALM_DELAY = 1100;
const PX_PER_CM = 5.2;          // 画面尺度换算成标注上的厘米
const PUSH_RADIUS = 210;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* 彩铅色系。每件标本抽一组，组里四支笔：深、中、浅，外加一支对比色。
   对比色是关键 —— 参考图那颗牙之所以好看，是品红里压着青绿，
   不是因为紫画得准。一组颜色只在自己的色相里叠，画面必灰。 */
const FAMILIES = [
  { deep: '#6E2A5E', mid: '#A24C87', lite: '#DFB6D0', cool: '#4E8FA0' },
  { deep: '#4A3B86', mid: '#7361AC', lite: '#C6C2E4', cool: '#4E9A92' },
  { deep: '#2F6B72', mid: '#559A9C', lite: '#C2DDD7', cool: '#9A4E86' },
  { deep: '#7B3350', mid: '#B06277', lite: '#E6C3C7', cool: '#5E7FB0' },
];

/* 高斯突起。把一个正圆在指定角度上鼓出来或按下去，
   几个叠起来就能写出有意义的轮廓 —— 牙冠和两条牙根、
   耳朵的尖、肾的凹口。随机谐波写不出这些，
   写出来的永远是变形虫，而变形虫没有意义。 */
const bump = (a, c, w) => {
  let d = a - c;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.exp(-(d * d) / (w * w));
};

const HALF = Math.PI / 2;

const hexa = (h, a) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* 画布 y 轴朝下，所以 -π/2 是上、π/2 是下 */
const SHAPES = [
  /* 臼齿：一个冠，两条根 */
  (a) => 1 - 0.12 * Math.cos(2 * a)
           + 0.55 * bump(a, 1.15, 0.3) + 0.55 * bump(a, 1.99, 0.3)
           - 0.45 * bump(a, HALF, 0.16),
  /* 耳：一个尖，一侧内凹 */
  (a) => 1 + 0.45 * bump(a, -HALF, 0.5)
           - 0.3 * bump(a, Math.PI * 0.85, 0.45)
           + 0.12 * Math.sin(a),
  /* 肾：一侧一个凹口 */
  (a) => 1 + 0.14 * Math.cos(2 * a) - 0.42 * bump(a, Math.PI, 0.42),
  /* 叶／肺叶：水滴 */
  (a) => 1 + 0.5 * bump(a, -HALF, 0.62) - 0.1 * bump(a, HALF, 0.5),
  /* 心／双叶：两个上叶夹一道裂 */
  (a) => 1 + 0.24 * bump(a, -Math.PI * 0.78, 0.4)
           + 0.24 * bump(a, -Math.PI * 0.22, 0.4)
           - 0.32 * bump(a, -HALF, 0.22)
           + 0.14 * bump(a, HALF, 0.5),
];

export function initExamTable(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1;
  let specs = [];
  let edges = [];
  let narrow = false;

  const pointer = { x: -1e4, y: -1e4, down: false, active: false };
  let lastMove = -1e9;
  let live = 0;                 // 测量线的显隐，缓动
  let raf = 0;

  /* ---------- 标本 ---------- */

  /* 烘焙一件标本，1:1 画，一次画完存起来，主循环只负责贴。
     三层，顺序就是画彩铅的顺序：
       底色 —— 降采样再放大，湿的、漫射的，负责大关系
       排线 —— 全分辨率几百笔，负责质感
       轮廓 —— 一道定形的线，负责「这是一件东西」
     之前只有第一层，所以凑近看什么都没有，就是一团雾。 */
  const bake = (w, h) => {
    const fam = pick(FAMILIES);
    const form = pick(SHAPES);
    /* 一个有名字的轮廓，再叠一点点谐波抖动 ——
       完全规整就成了图标，抖动是为了让它像一件东西而不是一个符号 */
    const jitter = [
      { f: 3, p: rand(0, 6.283), a: rand(0.02, 0.055) },
      { f: 7, p: rand(0, 6.283), a: rand(0.01, 0.03) },
    ];

    const pad = Math.round(Math.max(w, h) * 0.12);
    const cw = Math.round(w) + pad * 2, ch = Math.round(h) + pad * 2;
    const ox = cw / 2, oy = ch / 2;
    const rx = w / 2 / 1.5, ry = h / 2 / 1.5;   // 轮廓函数最大能到 1.5
    const rad = Math.max(rx, ry);

    const trace = (dx, dy) => {
      const p = new Path2D();
      const N = 180;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        let k = form(a);
        for (const t of jitter) k += Math.sin(a * t.f + t.p) * t.a;
        const x = ox + dx + Math.cos(a) * rx * k;
        const y = oy + dy + Math.sin(a) * ry * k;
        if (i) p.lineTo(x, y); else p.moveTo(x, y);
      }
      p.closePath();
      return p;
    };
    const shape = trace(0, 0);

    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d');

    /* 光从左上来，核落在背光那一侧 */
    const la = -2.3 + rand(-0.45, 0.45);
    const cosl = Math.cos(la), sinl = Math.sin(la);
    const kx = ox - cosl * rx * 0.3, ky = oy - sinl * ry * 0.3;
    const shadeAt = (x, y) => {
      const lit = ((x - ox) * cosl + (y - oy) * sinl) / rad;
      const d = Math.hypot((x - kx) / rad, (y - ky) / rad);
      return clamp01(0.52 - lit * 0.42 + (1 - Math.min(1, d)) * 0.3);
    };

    /* ---- 1. 底色 ---- */
    const sw = Math.max(4, Math.round(cw / WASH_LO));
    const sh = Math.max(4, Math.round(ch / WASH_LO));
    const wash = document.createElement('canvas');
    wash.width = sw; wash.height = sh;
    const wg = wash.getContext('2d');
    wg.scale(sw / cw, sh / ch);
    wg.clip(shape);
    const gr = wg.createLinearGradient(ox + cosl * rx, oy + sinl * ry,
                                       ox - cosl * rx, oy - sinl * ry);
    gr.addColorStop(0, hexa(fam.lite, 0.85));
    gr.addColorStop(1, hexa(fam.mid, 0.9));
    wg.fillStyle = gr;
    wg.fillRect(0, 0, cw, ch);
    const core = wg.createRadialGradient(kx, ky, 0, kx, ky, rad * 0.8);
    core.addColorStop(0, hexa(fam.deep, 0.7));
    core.addColorStop(1, hexa(fam.deep, 0));
    wg.fillStyle = core;
    wg.fillRect(0, 0, cw, ch);

    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.globalAlpha = 0.8;
    g.drawImage(wash, 0, 0, cw, ch);
    g.globalAlpha = 1;

    /* ---- 2. 排线 ---- */
    g.save();
    g.clip(shape);
    g.lineCap = 'round';
    const target = Math.round((w * h) / 95);
    for (let i = 0, guard = 0; i < target && guard < target * 14; guard++) {
      const x = rand(pad * 0.4, cw - pad * 0.4);
      const y = rand(pad * 0.4, ch - pad * 0.4);
      if (!g.isPointInPath(shape, x, y)) continue;
      const s = shadeAt(x, y);
      /* 亮的地方少下笔，高光那一块几乎留白 —— 彩铅的亮部是纸，不是白颜料 */
      if (Math.random() > 0.18 + s * 1.05) continue;
      i++;

      /* 笔顺沿着形走：垂直于从中心出发的半径。
         乱下笔看着像噪点，顺着形走才叫塑形 */
      const ra = Math.atan2((y - oy) / ry, (x - ox) / rx);
      /* 长短两种笔混着下。全是短的会织成一层毛，
         得有几笔长的扫过去，才像是画的而不是长出来的。 */
      const long = Math.random() < 0.3;
      const dir = ra + Math.PI / 2 + rand(-0.34, 0.34) * (long ? 0.4 : 1);
      const len = rad * (long ? rand(0.22, 0.46) : rand(0.05, 0.15));
      const ux = Math.cos(dir) * len * 0.5, uy = Math.sin(dir) * len * 0.5;
      const bow = rand(-0.3, 0.3);

      const accent = Math.random() < 0.16;
      const col = accent ? fam.cool : s > 0.66 ? fam.deep : s > 0.4 ? fam.mid : fam.lite;
      g.strokeStyle = hexa(col, rand(0.05, 0.17) * (0.4 + s) * (long ? 0.6 : 1));
      g.lineWidth = long ? rand(0.5, 1.1) : rand(0.7, 1.8);
      g.beginPath();
      g.moveTo(x - ux, y - uy);
      g.quadraticCurveTo(x - uy * bow, y + ux * bow, x + ux, y + uy);
      g.stroke();
    }
    g.restore();

    /* ---- 3. 轮廓 ----
       两道错开的彩边留住参考图一那点色散，中间一道深色定形。
       没有这道线，排线就是飘在纸上的一片毛。 */
    g.lineWidth = Math.max(0.8, rad * 0.012);
    g.strokeStyle = hexa(fam.cool, 0.3);
    g.stroke(trace(-1.4, -0.9));
    g.strokeStyle = hexa(fam.mid, 0.26);
    g.stroke(trace(1.4, 0.9));
    g.strokeStyle = hexa(fam.deep, 0.55);
    g.stroke(shape);

    return { bmp: cv, dw: cw, dh: ch };
  };


  /* 标本铺满整屏，但要稀。
     候选点里挑离已有标本最远的那个，同时躲开标题所在的那一块 ——
     文字压在上面，底下不能正好是最实的一件。 */
  const textZone = (x, y) => {
    /* 竖屏时标题横跨整个宽度，只能按高度让 */
    if (narrow) return y > H * 0.38 && y < H * 0.72 ? 0.25 : 1;
    const inX = x > W * 0.02 && x < W * 0.5;
    const inY = y > H * 0.2 && y < H * 0.78;
    return inX && inY ? 0.25 : 1;
  };

  const seed = () => {
    specs = [];
    const base = Math.min(W, H);
    /* 一大两中四小 —— 全一样大就成了图案 */
    const sizes = [1, 0.78, 0.66, 0.5, 0.44, 0.36, 0.3, 0.26, 0.22]
      .slice(0, SPECIMENS)
      .map((v) => v * base * 0.3);

    for (const s of sizes) {
      let best = null, bestScore = -1;
      for (let t = 0; t < 26; t++) {
        const x = rand(W * 0.06, W * 0.96);
        const y = rand(H * 0.08, H * 0.94);
        let md = 1e5;
        for (const o of specs) md = Math.min(md, Math.hypot(x - o.x, y - o.y));
        const score = Math.min(md, base * 0.6) * textZone(x, y);
        if (score > bestScore) { bestScore = score; best = [x, y]; }
      }
      const w = s * rand(0.85, 1.25);
      const h = s * rand(0.7, 1.05);
      const b = bake(w, h);
      specs.push({
        x: best[0], y: best[1],
        hx: best[0], hy: best[1],
        vx: 0, vy: 0,
        r: Math.max(w, h) * 0.5,
        /* 转得有限 —— 转过头，牙就不是牙了，轮廓的意义就丢了 */
        rot: rand(-0.35, 0.35),
        drift: rand(0, 6.283),
        plate: Math.random() < 0.6,
        ...b,
      });
    }
    buildEdges();
  };

  /* 静息时的红线：先在最靠中间的三件之间连一个三角（参考图里那个三角），
     剩下的每件接到离它最近的、已经在网里的那件上。
     最小生成树 + 一个三角 = 稀疏但连通，不会连成一张网。 */
  const buildEdges = () => {
    edges = [];
    if (specs.length < 2) return;
    const cxx = W / 2, cyy = H / 2;
    const order = specs
      .map((s, i) => ({ i, d: Math.hypot(s.x - cxx, s.y - cyy) }))
      .sort((a, b) => a.d - b.d)
      .map((o) => o.i);

    const inNet = new Set();
    const tri = order.slice(0, 3);
    for (let a = 0; a < tri.length; a++) {
      for (let b = a + 1; b < tri.length; b++) edges.push([tri[a], tri[b]]);
      inNet.add(tri[a]);
    }
    for (const i of order.slice(3)) {
      let best = -1, bd = Infinity;
      for (const j of inNet) {
        const d = Math.hypot(specs[i].x - specs[j].x, specs[i].y - specs[j].y);
        if (d < bd) { bd = d; best = j; }
      }
      if (best >= 0) edges.push([i, best]);
      inNet.add(i);
    }
  };

  /* ---------- 尺寸 ---------- */

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    W = r.width; H = r.height;
    narrow = W < 760;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return true;
  };

  /* ---------- 动力学 ---------- */

  const step = (now) => {
    const calm = now - lastMove > CALM_DELAY;
    live += ((pointer.active && !calm ? 1 : 0) - live) * 0.12;

    for (const s of specs) {
      /* 台面上的东西不会自己跑，只是极缓地晃 */
      s.drift += 0.0016;
      s.vx += Math.cos(s.drift) * 0.011;
      s.vy += Math.sin(s.drift * 1.23) * 0.011;

      /* 指针推开 —— 力道比细胞那版小得多，这是在台面上推一件东西，
         不是把它炸开 */
      if (pointer.active) {
        const dx = s.x - pointer.x, dy = s.y - pointer.y;
        const d = Math.hypot(dx, dy);
        const reach = PUSH_RADIUS + s.r * 0.5;
        if (d < reach && d > 0.01) {
          const f = (1 - d / reach) ** 2 * (pointer.down ? 1.5 : 0.5);
          s.vx += (dx / d) * f;
          s.vy += (dy / d) * f;
        }
      }

      /* 回原位 */
      s.vx += (s.hx - s.x) * (calm ? 0.011 : 0.005);
      s.vy += (s.hy - s.y) * (calm ? 0.011 : 0.005);

      s.vx *= 0.9; s.vy *= 0.9;
      s.x += s.vx; s.y += s.vy;
      s.rot += (s.vx * 0.00035);
    }
  };

  /* ---------- 红线 ---------- */

  /* 一条量距离的线：两端按标本半径让开，端点打刻度，中点上标 cm。
     标注底下垫一小块纸色 —— 线不能从字里穿过去。 */
  const thread = (ax, ay, bx, by, ta, tb, alpha, label) => {
    if (alpha <= 0.01) return;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < ta + tb + 24) return;
    const ux = dx / len, uy = dy / len;
    const x0 = ax + ux * ta, y0 = ay + uy * ta;
    const x1 = bx - ux * tb, y1 = by - uy * tb;

    ctx.strokeStyle = `rgba(${RED},${0.8 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    /* 端点刻度，垂直于线 —— 这一笔才让它从「连线」变成「尺寸线」 */
    const px = -uy * 4.5, py = ux * 4.5;
    ctx.beginPath();
    ctx.moveTo(x0 - px, y0 - py); ctx.lineTo(x0 + px, y0 + py);
    ctx.moveTo(x1 - px, y1 - py); ctx.lineTo(x1 + px, y1 + py);
    ctx.stroke();

    if (!label) return;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    let a = Math.atan2(uy, ux);
    if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;   // 字不能倒着

    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(a);
    ctx.font = '10px "Fragment Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(label).width;
    ctx.fillStyle = `rgba(${PAPER},${0.9 * alpha})`;
    ctx.fillRect(-w / 2 - 3, -6, w + 6, 12);
    ctx.fillStyle = `rgba(${RED},${0.95 * alpha})`;
    ctx.fillText(label, 0, 0.5);
    ctx.restore();
  };

  const cm = (len) => `${Math.round(len / PX_PER_CM)}cm`;

  /* ---------- 绘制 ---------- */

  const draw = () => {
    ctx.clearRect(0, 0, W, H);

    /* 盘子：极淡的一圈，参考图里每件标本都摆在白纸盘上。
       重了就成了装饰，只留一个暗示。 */
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 1;
    for (const s of specs) {
      if (!s.plate) continue;
      ctx.strokeStyle = `rgba(${INK},0.06)`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + s.dh * 0.14, s.dw * 0.46, s.dw * 0.17, 0, 0, 6.283);
      ctx.stroke();
    }

    /* 标本 */
    ctx.globalCompositeOperation = 'multiply';
    for (const s of specs) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.drawImage(s.bmp, -s.dw / 2, -s.dh / 2, s.dw, s.dh);
      ctx.restore();
    }

    /* 红线在最上层，而且是 source-over —— 它是标注，不是画面的一部分 */
    ctx.globalCompositeOperation = 'source-over';

    /* 你一开始量，静息的那张网就退到后面去 ——
       不退的话两套线一样重，画面在读者眼里没有主次 */
    const restA = 0.32 + (1 - live) * 0.68;
    for (const [i, j] of edges) {
      const a = specs[i], b = specs[j];
      thread(a.x, a.y, b.x, b.y, a.r * 0.8, b.r * 0.8, restA,
             cm(Math.hypot(b.x - a.x, b.y - a.y)));
    }

    /* 指针进场就是在量：连到最近的三件 */
    if (live > 0.01) {
      const near = specs
        .map((s) => ({ s, d: Math.hypot(s.x - pointer.x, s.y - pointer.y) }))
        .sort((p, q) => p.d - q.d)
        .slice(0, 3);
      for (const { s } of near) {
        thread(pointer.x, pointer.y, s.x, s.y, 7, s.r * 0.8, live, cm(
          Math.hypot(s.x - pointer.x, s.y - pointer.y)));
      }
      /* 指针本身是一个测点 */
      ctx.strokeStyle = `rgba(${RED},${0.9 * live})`;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 3.5, 0, 6.283);
      ctx.stroke();
    }
  };

  /* ---------- 主循环 ---------- */

  const frame = (now) => {
    step(now);
    draw();
    raf = requestAnimationFrame(frame);
  };

  /* ---------- 交互 ---------- */

  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
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
    if (!resize()) return;        // 容器还没有尺寸，等 ResizeObserver 再来
    seed();
    if (reduced) {
      for (let i = 0; i < 40; i++) step(performance.now());
      draw();
    } else if (!raf) {
      raf = requestAnimationFrame(frame);
    }
    started = true;
  };

  start();

  /* 字体落定后重画一次 —— 首帧时 Fragment Mono 可能还没到，
     标注会先用回退字体量出错误的宽度 */
  document.fonts?.ready.then(() => { if (started && reduced) draw(); });

  let rt = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (!started) { start(); return; }
      const b = { w: W, h: H };
      if (!resize()) return;
      /* 标本的位置是按整屏铺的，屏幕变了就得重铺；
         小幅变化按比例挪一下就行，免得调个窗口整台重来 */
      if (Math.abs(W - b.w) > b.w * 0.25 || Math.abs(H - b.h) > b.h * 0.25) {
        seed();
      } else {
        const kx = W / b.w, ky = H / b.h;
        for (const s of specs) {
          s.hx *= kx; s.hy *= ky;
          s.x *= kx; s.y *= ky;
        }
      }
      if (reduced) draw();
    }, 140);
  });
  ro.observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (reduced) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) raf = requestAnimationFrame(frame);
  });
}
