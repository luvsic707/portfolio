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
/* 烘焙分辨率的倒数，也就是磨砂的程度。
   调大了确实更像磨砂玻璃，但轮廓会糊成一团 —— 形没了，意义也就没了。
   2.4 是还能认出是颗牙、是只耳朵的上限。 */
const UP = 2.4;
const CALM_DELAY = 1100;
const PX_PER_CM = 5.2;          // 画面尺度换算成标注上的厘米
const PUSH_RADIUS = 210;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* 冷调虹彩。暖层和冷层各一套，错位相乘 —— 参考的是隔着磨砂玻璃的那只手：
   主体压成紫灰，边上漏出暖橙和青绿。
   三个色标分别是：淡处 / 中间调 / 核。
   必须起得很淡 —— 两层相乘会把明度压掉一大半，
   按「看起来对」的深浅去配，相乘出来就是一摊墨。 */
const WARM = [
  ['#F1DDD2', '#D9A9AC', '#B4737C'],
  ['#EFDCC9', '#D5A2A0', '#B07179'],
  ['#F2DECF', '#D29CA6', '#AC6E80'],
];
const COOL = [
  ['#D9D4E8', '#AEC5C8', '#7E7FA8'],
  ['#D5D0E6', '#B3C7BF', '#787CA4'],
  ['#D8D2E4', '#A9C0CE', '#8480AA'],
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

  /* 烘焙一件标本。低分辨率画好，主循环里放大 UP 倍贴出去。 */
  const bake = (w, h) => {
    const iw = Math.max(6, Math.round(w / UP));
    const ih = Math.max(6, Math.round(h / UP));
    const pad = 12;                       // 低分辨率下的留边，放大后是漫射的余地
    const cw = iw + pad * 2, ch = ih + pad * 2;

    /* 一个有名字的轮廓，再叠一点点谐波抖动 ——
       完全规整就成了图标，抖动是为了让它像一件东西而不是一个符号 */
    const form = pick(SHAPES);
    const jitter = [
      { f: 3, p: rand(0, 6.283), a: rand(0.02, 0.055) },
      { f: 7, p: rand(0, 6.283), a: rand(0.01, 0.03) },
    ];

    const blob = (g, ox, oy, rx, ry, k0) => {
      g.beginPath();
      const N = 90;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        let k = form(a) * k0;
        for (const t of jitter) k += Math.sin(a * t.f + t.p) * t.a;
        const x = ox + Math.cos(a) * rx * k;
        const y = oy + Math.sin(a) * ry * k;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath();
    };

    /* 核和高光都用径向渐变，不用第二个多边形。
       用多边形的话，放大之后那圈边还是看得出来，
       每件标本里都卧着同一个月牙 —— 一眼就是模板，不是标本。 */
    const layer = (stops, sx, sy, ang) => {
      const cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const g = cv.getContext('2d');
      const ox = cw / 2 + sx, oy = ch / 2 + sy;
      const rx = iw / 2 / 1.5, ry = ih / 2 / 1.5;   // 轮廓函数最大能到 1.5
      const rad = Math.max(rx, ry);

      blob(g, ox, oy, rx, ry, 1);
      g.save();
      g.clip();

      const ca = Math.cos(ang), sa = Math.sin(ang);
      const gr = g.createLinearGradient(ox - ca * rx, oy - sa * ry, ox + ca * rx, oy + sa * ry);
      gr.addColorStop(0, stops[0]);
      gr.addColorStop(1, stops[1]);
      g.fillStyle = gr;
      g.fillRect(0, 0, cw, ch);

      /* 偏心的深核 —— 参考的是那颗牙的牙髓腔。
         少了这一层，标本就是一块平色斑，没有体积。 */
      const kx = ox + rx * 0.12, ky = oy + ry * 0.16;
      const core = g.createRadialGradient(kx, ky, 0, kx, ky, rad * 0.72);
      core.addColorStop(0, hexa(stops[2], 0.9));
      core.addColorStop(0.5, hexa(stops[2], 0.42));
      core.addColorStop(1, hexa(stops[2], 0));
      g.fillStyle = core;
      g.fillRect(0, 0, cw, ch);

      /* 朝光那一侧的反光：湿的东西都有，参考图里那几只猪耳朵上都是 */
      g.globalCompositeOperation = 'lighten';
      const hx = ox - rx * 0.3, hy = oy - ry * 0.34;
      /* 只能是一小块。铺满整个形的话，反光就不是反光，是把形洗白了 */
      const sheen = g.createRadialGradient(hx, hy, 0, hx, hy, rad * 0.48);
      sheen.addColorStop(0, hexa(stops[0], 0.8));
      sheen.addColorStop(1, hexa(stops[0], 0));
      g.fillStyle = sheen;
      g.fillRect(0, 0, cw, ch);

      g.restore();
      return cv;
    };

    /* 偏移量按低分辨率算，放大后就是几个像素的色散。
       两层的渐变角度也错开 —— 只错位置只在边上出彩边，
       连角度一起错，整个形体内部才有冷暖的流动。 */
    const d = 1.6;
    const ang = rand(0, 6.283);
    const cool = layer(pick(COOL), -d, -d * 0.6, ang + 0.8);
    const warm = layer(pick(WARM), d, d * 0.6, ang);

    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    const o = out.getContext('2d');
    o.globalAlpha = 0.94;
    o.drawImage(cool, 0, 0);
    o.globalCompositeOperation = 'multiply';
    o.globalAlpha = 0.9;
    o.drawImage(warm, 0, 0);

    return { bmp: out, dw: cw * UP, dh: ch * UP };
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
