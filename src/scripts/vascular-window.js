/* ============================================================
   首屏：观察窗 —— Red Thread Rehab

   三块玻璃，各画各的，顺序就是概念本身：

     标本（下）  一件三维的血管标本，血在里面走，可以转着看
     玻璃（中）  起了雾的窗。你擦哪儿，哪儿破一个洞
     仪器（上）  红线卡尺。只量已经擦干净、看得见的地方

   —— 为什么改成三维 ——

   二维版最大的毛病是疏密太平均：一张摊平的网，
   哪儿都一样密，所以哪儿都不好看。
   长在三维里，前后自己就会重叠，近的实远的虚，
   层次是空间给的，不用一笔一笔去凑。
   而且转得动 —— 一件能翻过来看的标本才叫标本。

   —— 血管怎么长出来 ——

   空间殖民（Runions 的叶脉算法）的三维版：
   在一个有裂片的椭球里撒下生长素，每个生长素吸引最近的节点，
   节点朝着吸引它的那些的平均方向长一小截，走到跟前就把生长素吃掉。
   「走到跟前」的半径跟着局部密度走 —— 密处吃得近，长出细密的丛；
   疏处吃得远，只剩主干横穿。疏密关系就是在那一行里定的。
   长完按达芬奇分叉律（父枝截面 = 子枝截面之和）从末梢回推粗细。

   —— 为什么雾要用位移不用模糊 ——

   真磨砂玻璃是折射：表面的粗糙把光推歪，你看到的是
   被局部推移过的背后，不是被均匀抹开的背后。
   纯高斯模糊没有透镜效应，一眼就假。
   玻璃层挂 SVG 的 feTurbulence + feDisplacementMap，浏览器拿 GPU 做。
   附带的好处是：擦出来的洞口边缘也被同一个湍流打碎，
   所以擦痕是毛的、是湿的，不是一个圆。
   ============================================================ */

const RED = '196,22,50';
const DEEP = '150,16,42';
const DARK = '92,10,28';

const ATTRACTORS = 8500;
const ATTRACT_D = 88;
const KILL_BASE = 10;

/* 体积的长宽高比。横屏里长一个正球，上下会被裁掉一大截、
   左右又空着 —— 节点都长在看不见的地方。按画面的比例配。 */
const AX = 1.25, AY = 0.95, AZ = 0.55;
/* 每节的长度。短了更细腻，但节点预算会在铺满整个椭球之前用完，
   于是两头有东西、中间一个大洞 —— 覆盖比细腻重要。 */
const SEG = 6.4;
const MAX_NODES = 18000;
const GROW_PER_FRAME = 14;

const STIPPLE = 24000;          // 点云。每帧跟着相机重新投影
const PULSES = 100;
const PULSE_SPEED = 2.1;

const BRUSH_R = 104;
const REFOG = 0.0055;
const LANDMARKS = 12;
const PX_PER_CM = 5.2;
const CALM_DELAY = 900;
const SPIN = 0.0022;            // 闲置时的自转

const GX = 52, GY = 32;
const BANDS = 4;                // 深度分层。近实远虚，空气透视

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------- 三维值噪声：只用来给生长素定疏密 ---------- */

const hash3 = (x, y, z, s) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^
          Math.imul(z, 1442695041) ^ Math.imul(s, 2246822519 | 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const smooth = (t) => t * t * (3 - 2 * t);

const vnoise = (x, y, z, s) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, s);
  const lx = (a, b) => a + (b - a) * u;
  const l00 = lx(c(0, 0, 0), c(1, 0, 0)), l10 = lx(c(0, 1, 0), c(1, 1, 0));
  const l01 = lx(c(0, 0, 1), c(1, 0, 1)), l11 = lx(c(0, 1, 1), c(1, 1, 1));
  const a0 = l00 + (l10 - l00) * v, a1 = l01 + (l11 - l01) * v;
  return a0 + (a1 - a0) * w;
};

export function initVascularWindow(elSpec, elGlass, elTool, elTel) {
  const spec = elSpec.getContext('2d');
  const glass = elGlass.getContext('2d');
  const tool = elTool.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1;
  let vx0 = 0, vy0 = 0, R = 0, FOV = 0, ZOOM = 1;
  const nseed = Math.floor(rand(0, 9999));

  /* 血管：平铺数组。长完就不动了 —— 动的是相机 */
  let nx, ny, nz, npar, nw, px, py, pf;
  let kids = [], count = 0, roots = [];

  let attr = [], cell = 0;
  let gridMap = new Map();
  let growing = true;

  let dots = null, dotN = 0;     // 点云的三维坐标
  let mask = null, kctx = null;
  let pulses = [], marks = [];

  let clarity = new Float32Array(GX * GY);
  let maxClear = 0;
  let rev = null;

  const ptr = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, down: false, active: false };
  let lastMove = -1e9;
  let live = 0;
  let yaw = 0.35, pitch = -0.2, vyaw = 0, vpitch = 0;
  let dragX = 0, dragY = 0;
  let raf = 0;

  /* ---------- 疏密场 ----------
     取三次幂，把分布压成「几团很密 + 大片很疏」。
     线性的噪声给出来的是处处差不多，那正是上一版不好看的原因。 */
  const density = (x, y, z) => {
    const s = R * 0.5;
    /* 幂次决定疏密拉得多开。三次方太狠 —— 会挤成对角两团、
       中间开一个大洞。底下垫一个基数，保证哪儿都不是全空的，
       疏的地方也该有主干横穿。 */
    return clamp01(0.22 + Math.pow(vnoise(x / s, y / s, z / s, nseed), 2.1) * 1.9);
  };

  /* 裂片椭球，比画面大 —— 所以器官是被画框裁掉的，有体量 */
  const lobe = rand(0, 6.283);
  const shell = (a, b) => 1
    + Math.sin(a + lobe) * 0.12
    + Math.sin(a * 2 - lobe * 1.4) * 0.16
    + Math.sin(a * 3 + lobe * 0.6) * 0.08
    + Math.sin(b * 2 + lobe) * 0.1;

  /* ---------- 空间索引 ---------- */

  const gkey = (ix, iy, iz) => (ix + 64) + (iy + 64) * 1024 + (iz + 64) * 1048576;

  const addToGrid = (i) => {
    const k = gkey((nx[i] / cell) | 0, (ny[i] / cell) | 0, (nz[i] / cell) | 0);
    let a = gridMap.get(k);
    if (!a) { a = []; gridMap.set(k, a); }
    a.push(i);
  };

  /* 只在邻近 27 格里找最近的节点。不这么做的话，
     八千个生长素 × 一万多节点，每一步都是上亿次比较。 */
  const nearest = (x, y, z) => {
    const gx = (x / cell) | 0, gy = (y / cell) | 0, gz = (z / cell) | 0;
    let best = -1, bd = ATTRACT_D * ATTRACT_D;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const a = gridMap.get(gkey(gx + dx, gy + dy, gz + dz));
          if (!a) continue;
          for (const i of a) {
            const d = (nx[i] - x) ** 2 + (ny[i] - y) ** 2 + (nz[i] - z) ** 2;
            if (d < bd) { bd = d; best = i; }
          }
        }
      }
    }
    return best;
  };

  /* ---------- 播种 ---------- */

  const seed = () => {
    nx = new Float32Array(MAX_NODES);
    ny = new Float32Array(MAX_NODES);
    nz = new Float32Array(MAX_NODES);
    npar = new Int32Array(MAX_NODES).fill(-1);
    nw = new Float32Array(MAX_NODES);
    px = new Float32Array(MAX_NODES);
    py = new Float32Array(MAX_NODES);
    pf = new Float32Array(MAX_NODES);
    kids = []; count = 0; roots = [];
    gridMap = new Map();
    cell = ATTRACT_D;
    growing = true;
    dots = null; dotN = 0;

    attr = [];
    let guard = 0;
    while (attr.length < ATTRACTORS * 3 && guard < ATTRACTORS * 30) {
      guard++;
      const x = rand(-R * AX * 1.2, R * AX * 1.2);
      const y = rand(-R * AY * 1.2, R * AY * 1.2);
      const z = rand(-R * AZ * 1.2, R * AZ * 1.2);
      const r = Math.hypot(x / AX, y / AY, z / AZ) / R;
      if (r > shell(Math.atan2(y, x), Math.atan2(z, Math.hypot(x, y)))) continue;
      if (Math.random() > density(x, y, z) * 1.25) continue;
      attr.push(x, y, z);
    }

    /* 主干从体外伸进来。从一个点往外长得到的是烟花；
       从外面进来、一路分叉，才是一件长在别处的东西。

       根的位置必须从生长素里反推 —— 直接按比例摆在椭球外面，
       它离最近的生长素有几百像素，而吸引半径只有九十几，
       于是一个生长素也召唤不到它，第一步就停了。 */
    /* 只留一个门 —— 两个根各长各的，预算一半一半，中间那块谁也长不到。
       门放在体积中心偏上：放在底边的话树呈扇形往上散，
       四个角永远是空的，铺不满整屏。从中心出发才会朝各个方向铺开。 */
    const tx = 0, ty = -R * AY * 0.12, tz = 0;
    let best = -1, bd = Infinity;
    for (let a = 0; a < attr.length; a += 3) {
      const d = (attr[a] - tx) ** 2 + (attr[a + 1] - ty) ** 2 + (attr[a + 2] - tz) ** 2;
      if (d < bd) { bd = d; best = a; }
    }
    if (best >= 0) {
      const i = count++;
      nx[i] = attr[best]; ny[i] = attr[best + 1] + ATTRACT_D * 0.4; nz[i] = attr[best + 2];
      kids[i] = [];
      addToGrid(i); roots.push(i);
    }
  };

  /* ---------- 生长 ---------- */

  const growStep = () => {
    if (!growing) return;
    if (count >= MAX_NODES || attr.length === 0) { finishGrow(); return; }

    const ax = new Map(), ay = new Map(), az = new Map();
    for (let a = 0; a < attr.length; a += 3) {
      const i = nearest(attr[a], attr[a + 1], attr[a + 2]);
      if (i < 0) continue;
      const dx = attr[a] - nx[i], dy = attr[a + 1] - ny[i], dz = attr[a + 2] - nz[i];
      const m = Math.hypot(dx, dy, dz) || 1;
      ax.set(i, (ax.get(i) || 0) + dx / m);
      ay.set(i, (ay.get(i) || 0) + dy / m);
      az.set(i, (az.get(i) || 0) + dz / m);
    }
    if (ax.size === 0) { finishGrow(); return; }

    for (const [i, sx] of ax) {
      if (count >= MAX_NODES) break;
      const sy = ay.get(i), sz = az.get(i);
      let m = Math.hypot(sx, sy, sz);
      if (m < 1e-6) continue;
      /* 一点抖动。笔直的分叉看着像电路板，不像血管 */
      const ux = sx / m + rand(-0.15, 0.15);
      const uy = sy / m + rand(-0.15, 0.15);
      const uz = sz / m + rand(-0.15, 0.15);
      m = Math.hypot(ux, uy, uz) || 1;
      const j = count++;
      nx[j] = nx[i] + (ux / m) * SEG;
      ny[j] = ny[i] + (uy / m) * SEG;
      nz[j] = nz[i] + (uz / m) * SEG;
      npar[j] = i; kids[j] = []; kids[i].push(j);
      addToGrid(j);
    }

    /* 吃掉的半径跟着局部密度走 —— 疏密关系就定在这里。
       用一个固定半径的话，全场一样细，那就是上一版那张摊平的网。 */
    const keep = [];
    for (let a = 0; a < attr.length; a += 3) {
      const i = nearest(attr[a], attr[a + 1], attr[a + 2]);
      if (i >= 0) {
        const k = KILL_BASE * (1.75 - density(attr[a], attr[a + 1], attr[a + 2]) * 1.35);
        const d = (nx[i] - attr[a]) ** 2 + (ny[i] - attr[a + 1]) ** 2 + (nz[i] - attr[a + 2]) ** 2;
        if (d < k * k) continue;
      }
      keep.push(attr[a], attr[a + 1], attr[a + 2]);
    }
    attr = keep;
    if (attr.length === 0 || count >= MAX_NODES) finishGrow();
  };

  /* 空间殖民会在主枝上留一堆只有一节的小刺。
     不剪掉的话整张图是毛的、像划痕，不像血管。 */
  const prune = () => {
    const dead = new Uint8Array(count);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = count - 1; i >= 0; i--) {
        if (dead[i] || kids[i].length) continue;
        const p = npar[i];
        if (p >= 0 && kids[p].filter((k) => !dead[k]).length > 1) dead[i] = 1;
      }
      for (let i = 0; i < count; i++) {
        if (!dead[i]) kids[i] = kids[i].filter((k) => !dead[k]);
      }
    }
    for (let i = 0; i < count; i++) if (dead[i]) { kids[i] = []; npar[i] = -1; }
  };

  /* 达芬奇分叉律：父枝截面 = 子枝截面之和。
     从末梢往回推，主干自然粗起来 —— 手动分配粗细永远会露馅。 */
  const finishGrow = () => {
    if (!growing) return;
    growing = false;
    prune();
    for (let i = 0; i < count; i++) nw[i] = kids[i].length ? 0 : 0.5;
    for (let i = count - 1; i >= 0; i--) {
      if (kids[i].length) {
        let s = 0;
        /* 指数越小，父枝相对子枝越粗。2.4 是生理上偏准的值，
           但画面上主干和末梢拉不开；2.05 让少数主干真正粗壮起来。 */
        for (const k of kids[i]) s += Math.pow(nw[k], 2.05);
        nw[i] = Math.pow(s, 1 / 2.05);
      }
      if (nw[i] === 0) nw[i] = 0.5;
    }
    buildDots();
    placeMarks();
    seedPulses();
  };

  /* ---------- 点云 ----------
     三维坐标只算一次，每帧跟着相机投影。
     线只能给骨架，密度才同时给出体量、质感和深浅。 */
  const buildDots = () => {
    const segs = [];
    for (let i = 0; i < count; i++) if (npar[i] >= 0) segs.push(i);
    if (!segs.length) return;

    /* 按粗细加权抽样。均匀抽的话点会平摊在几万根毛细血管上，
       主干周围反而没有肉 —— 量感就出不来。 */
    const cum = new Float64Array(segs.length);
    let tot = 0;
    for (let k = 0; k < segs.length; k++) {
      tot += Math.pow(Math.min(9, nw[segs[k]]), 1.7);
      cum[k] = tot;
    }
    const pickSeg = () => {
      const r = Math.random() * tot;
      let lo = 0, hi = segs.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; }
      return segs[lo];
    };

    dotN = Math.min(STIPPLE, segs.length * 5);
    dots = new Float32Array(dotN * 4);
    for (let d = 0; d < dotN; d++) {
      const i = pickSeg();
      const p = npar[i];
      const w = Math.min(9, nw[i]);
      const t = Math.random();
      /* 两层：紧贴血管的一层，和向外弥散的一层组织雾 */
      const wide = Math.random() < 0.36;
      const sd = wide ? 9 + w * 8 : 0.6 + w * 1.3;
      const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * sd;
      dots[d * 4] = nx[p] + (nx[i] - nx[p]) * t + g();
      dots[d * 4 + 1] = ny[p] + (ny[i] - ny[p]) * t + g();
      dots[d * 4 + 2] = nz[p] + (nz[i] - nz[p]) * t + g();
      dots[d * 4 + 3] = wide ? 1 : 0;
    }
  };

  /* ---------- 地标 ----------
     只取够粗的分叉点 —— 量两根毛细血管之间的距离没有意义。 */
  const placeMarks = () => {
    marks = [];
    const cands = [];
    for (let i = 0; i < count; i++) if (kids[i].length > 1 && nw[i] > 1.2) cands.push(i);
    cands.sort((a, b) => nw[b] - nw[a]);
    const sep = R * 0.32;
    for (const i of cands) {
      if (marks.length >= LANDMARKS) break;
      if (marks.every((m) => Math.hypot(nx[m] - nx[i], ny[m] - ny[i], nz[m] - nz[i]) > sep)) {
        marks.push(i);
      }
    }
  };

  /* ---------- 搏动 ---------- */

  const newPulse = (t) => {
    const a = roots[(Math.random() * roots.length) | 0];
    const k = kids[a] && kids[a].length ? kids[a][(Math.random() * kids[a].length) | 0] : -1;
    return { i: a, j: k, t, v: rand(0.75, 1.3) };
  };
  const seedPulses = () => {
    pulses = [];
    for (let i = 0; i < PULSES; i++) pulses.push(newPulse(Math.random()));
  };
  const stepPulses = () => {
    for (let n = 0; n < pulses.length; n++) {
      const p = pulses[n];
      if (p.j < 0) { pulses[n] = newPulse(0); continue; }
      p.t += (PULSE_SPEED * p.v) / SEG;
      while (p.t >= 1) {
        p.t -= 1; p.i = p.j;
        const k = kids[p.i];
        /* 到了末梢就回根上重新出发 —— 血是循环的 */
        if (!k || !k.length) { pulses[n] = newPulse(0); break; }
        p.j = k[(Math.random() * k.length) | 0];
      }
    }
  };

  /* ---------- 相机 ---------- */

  let cyw = 1, syw = 0, cpt = 1, spt = 0;
  const setCam = () => {
    cyw = Math.cos(yaw); syw = Math.sin(yaw);
    cpt = Math.cos(pitch); spt = Math.sin(pitch);
  };

  const projectAll = () => {
    for (let i = 0; i < count; i++) {
      const x = nx[i], y = ny[i], z = nz[i];
      const x1 = x * cyw + z * syw;
      const z1 = z * cyw - x * syw;
      const y1 = y * cpt - z1 * spt;
      const z2 = z1 * cpt + y * spt;
      const f = FOV / (FOV + z2);
      px[i] = vx0 + x1 * f * ZOOM;
      py[i] = vy0 + y1 * f * ZOOM;
      pf[i] = f;
    }
  };

  const one = [0, 0, 0];
  const project1 = (x, y, z, out) => {
    const x1 = x * cyw + z * syw;
    const z1 = z * cyw - x * syw;
    const y1 = y * cpt - z1 * spt;
    const z2 = z1 * cpt + y * spt;
    const f = FOV / (FOV + z2);
    out[0] = vx0 + x1 * f * ZOOM;
    out[1] = vy0 + y1 * f * ZOOM;
    out[2] = f;
  };

  const bandOf = (f) => {
    const b = ((f - 0.6) / 0.25) | 0;
    return b < 0 ? 0 : b > BANDS - 1 ? BANDS - 1 : b;
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
      g.lineCap = 'round'; g.lineJoin = 'round';
    }
    vx0 = W * (W < 760 ? 0.5 : 0.56);
    vy0 = H * 0.48;
    /* 椭球的体积按 R³ 涨。R 定得太大，节点预算铺不满，
       结果就是长了一半停在那儿。宁可小一点、长满。
       配合 AX/AY/AZ 和 ZOOM，投影出来横向半径约 0.6 个画面宽 ——
       也就是四边都出血，主视觉铺满整屏。 */
    R = Math.max(W, H) * 0.42;
    FOV = R * 2.3;
    ZOOM = 1.46;

    [mask, kctx] = mk(pw, ph);
    clarity = new Float32Array(GX * GY);
    maxClear = 0; rev = null;
    seed();
    return true;
  };

  /* ---------- 擦雾 ---------- */

  const gridAt = (x, y) => {
    const gx = ((x / W) * GX) | 0, gy = ((y / H) * GY) | 0;
    if (gx < 0 || gx >= GX || gy < 0 || gy >= GY) return 0;
    return clarity[gy * GX + gx];
  };

  const blot = (x, y, r, a) => {
    const g = kctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.6, `rgba(255,255,255,${a * 0.5})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    kctx.fillStyle = g;
    kctx.beginPath(); kctx.arc(x, y, r, 0, 6.283); kctx.fill();
  };

  /* 手按在玻璃上不是一个圆盘：一小撮偏心的斑 + 一道顺着走向的拖痕。
     洞口的形状由它们定，再交给玻璃层的湍流把边打碎。 */
  const stamp = (x, y, dx, dy) => {
    kctx.globalCompositeOperation = 'lighter';
    blot(x, y, BRUSH_R * 0.72, 0.34);
    for (let i = 0; i < 4; i++) {
      const a = rand(0, 6.283), d = rand(0.2, 0.8) * BRUSH_R * 0.6;
      blot(x + Math.cos(a) * d, y + Math.sin(a) * d, BRUSH_R * rand(0.3, 0.55), rand(0.1, 0.24));
    }
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
        const qx = ((gx + 0.5) / GX) * W, qy = ((gy + 0.5) / GY) * H;
        const d2 = (qx - x) ** 2 + (qy - y) ** 2;
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
    const n = Math.max(1, Math.min(20, Math.ceil(Math.hypot(dx, dy) / 18)));
    for (let i = 1; i <= n; i++) stamp(ptr.px + (dx * i) / n, ptr.py + (dy * i) / n, dx, dy);
    ptr.px = ptr.x; ptr.py = ptr.y;
  };

  /* ---------- 画标本 ---------- */

  const drawSpecimen = () => {
    spec.clearRect(0, 0, W, H);
    if (growing || !dots) return;
    spec.globalCompositeOperation = 'multiply';

    /* 点云。按深度分四层，近的实远的虚 —— 空气透视，
       这是三维读起来有前后的关键，比任何描边都管用。 */
    const dp = [];
    for (let b = 0; b < BANDS * 2; b++) dp.push(new Path2D());
    for (let d = 0; d < dotN; d++) {
      project1(dots[d * 4], dots[d * 4 + 1], dots[d * 4 + 2], one);
      if (one[0] < -20 || one[0] > W + 20 || one[1] < -20 || one[1] > H + 20) continue;
      const kind = dots[d * 4 + 3];
      const s = !kind && one[2] > 1.08 ? 1.7 : 1;
      dp[bandOf(one[2]) * 2 + kind].rect(one[0], one[1], s, s);
    }
    for (let b = 0; b < BANDS; b++) {
      const k = 0.28 + b * 0.28;
      spec.fillStyle = `rgba(${DARK},${0.2 * k})`;
      spec.fill(dp[b * 2]);
      spec.fillStyle = `rgba(${RED},${0.11 * k})`;
      spec.fill(dp[b * 2 + 1]);
    }

    /* 血管。深度 × 粗细分组，每组一次 stroke ——
       一万多节各描各的，光是调用开销就吃满一帧。 */
    const vp = [];
    for (let i = 0; i < BANDS * 3; i++) vp.push(null);
    for (let i = 0; i < count; i++) {
      const p = npar[i];
      if (p < 0) continue;
      const w = nw[i];
      const g = bandOf(pf[i]) * 3 + (w > 2 ? 2 : w > 1.1 ? 1 : 0);
      if (!vp[g]) vp[g] = new Path2D();
      vp[g].moveTo(px[p], py[p]);
      vp[g].lineTo(px[i], py[i]);
    }
    for (let b = 0; b < BANDS; b++) {
      const k = 0.3 + b * 0.26;
      for (let t = 0; t < 3; t++) {
        const path = vp[b * 3 + t];
        if (!path) continue;
        spec.lineWidth = (t === 2 ? 3.1 : t === 1 ? 1.5 : 0.7) * (0.72 + b * 0.13);
        spec.strokeStyle = t === 2
          ? `rgba(${DARK},${0.68 * k})`
          : t === 1 ? `rgba(${DEEP},${0.56 * k})` : `rgba(${RED},${0.5 * k})`;
        spec.stroke(path);
      }
    }

    /* 血 */
    stepPulses();
    const a = [0, 0, 0];
    for (const p of pulses) {
      if (p.j < 0) continue;
      const t0 = Math.max(0, p.t - 0.6);
      const dx = nx[p.j] - nx[p.i], dy = ny[p.j] - ny[p.i], dz = nz[p.j] - nz[p.i];
      project1(nx[p.i] + dx * t0, ny[p.i] + dy * t0, nz[p.i] + dz * t0, a);
      project1(nx[p.i] + dx * p.t, ny[p.i] + dy * p.t, nz[p.i] + dz * p.t, one);
      spec.strokeStyle = `rgba(${DARK},${0.6 * clamp01((one[2] - 0.6) * 2)})`;
      spec.lineWidth = Math.min(5, (nw[p.j] || 0.6) * 1.4) * one[2];
      spec.beginPath();
      spec.moveTo(a[0], a[1]); spec.lineTo(one[0], one[1]);
      spec.stroke();
    }
    spec.globalCompositeOperation = 'source-over';
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
    tool.beginPath(); tool.moveTo(x0, y0); tool.lineTo(x1, y1); tool.stroke();

    /* 端点刻度垂直于线 —— 这一笔才让它从「连线」变成「尺寸线」 */
    const qx = -uy * 4.5, qy = ux * 4.5;
    tool.beginPath();
    tool.moveTo(x0 - qx, y0 - qy); tool.lineTo(x0 + qx, y0 + qy);
    tool.moveTo(x1 - qx, y1 - qy); tool.lineTo(x1 + qx, y1 + qy);
    tool.stroke();

    if (!label) return;
    let a = Math.atan2(uy, ux);
    if (a > Math.PI / 2 || a < -Math.PI / 2) a += Math.PI;   // 字不能倒着
    tool.save();
    tool.translate((x0 + x1) / 2, (y0 + y1) / 2);
    tool.rotate(a);
    tool.font = '10px "Fragment Mono", ui-monospace, monospace';
    tool.textAlign = 'center'; tool.textBaseline = 'middle';
    const w = tool.measureText(label).width;
    tool.fillStyle = `rgba(247,248,247,${0.85 * alpha})`;
    tool.fillRect(-w / 2 - 3, -6, w + 6, 12);
    tool.fillStyle = `rgba(${RED},${0.95 * alpha})`;
    tool.fillText(label, 0, 0.5);
    tool.restore();
  };

  /* 每帧在「当前看得见的地标」上现搭一棵最小生成树。
     擦得越多量得越多，雾回来就撤掉 —— 卡尺是跟着你走的，不是画好的。
     读数用三维真距，不是屏幕上的投影长度：转一圈数字不该跟着变。 */
  const drawTool = () => {
    tool.clearRect(0, 0, W, H);
    if (growing) return;

    const vis = [];
    for (const i of marks) {
      if (pf[i] < 0.6) continue;                    // 转到背面去的就不量了
      const c = clamp01(gridAt(px[i], py[i]) * 1.7);
      if (c > 0.05) vis.push({ i, c });
    }
    for (const { i, c } of vis) {
      tool.strokeStyle = `rgba(${RED},${0.6 * c})`;
      tool.lineWidth = 1;
      tool.beginPath(); tool.arc(px[i], py[i], 3, 0, 6.283); tool.stroke();
    }

    if (vis.length > 1) {
      const used = [0];
      const left = vis.map((_, k) => k).slice(1);
      while (left.length) {
        let bi = 0, bj = 0, bd = Infinity;
        for (const u of used) {
          for (let b = 0; b < left.length; b++) {
            const p = vis[u].i, q = vis[left[b]].i;
            const d = Math.hypot(px[p] - px[q], py[p] - py[q]);
            if (d < bd) { bd = d; bi = u; bj = b; }
          }
        }
        const j = left.splice(bj, 1)[0];
        used.push(j);
        const p = vis[bi], q = vis[j];
        const real = Math.hypot(nx[p.i] - nx[q.i], ny[p.i] - ny[q.i], nz[p.i] - nz[q.i]);
        thread(px[p.i], py[p.i], px[q.i], py[q.i], 9, 9,
               Math.min(p.c, q.c) * 0.95, `${Math.round(real / PX_PER_CM)}cm`);
      }
    }

    if (live > 0.02) {
      tool.strokeStyle = `rgba(${RED},${0.85 * live})`;
      tool.lineWidth = 1;
      tool.beginPath(); tool.arc(ptr.x, ptr.y, BRUSH_R * 0.3, 0, 6.283); tool.stroke();
      tool.beginPath();
      tool.moveTo(ptr.x - 7, ptr.y); tool.lineTo(ptr.x + 7, ptr.y);
      tool.moveTo(ptr.x, ptr.y - 7); tool.lineTo(ptr.x, ptr.y + 7);
      tool.stroke();

      const near = vis
        .map((v) => ({ v, d: Math.hypot(px[v.i] - ptr.x, py[v.i] - ptr.y) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { v, d } of near) {
        thread(ptr.x, ptr.y, px[v.i], py[v.i], BRUSH_R * 0.3, 9, live * v.c,
               `${Math.round(d / PX_PER_CM)}cm`);
      }
      /* 角度：真卡尺会读角，而且这一笔让仪器层不只是一堆直线 */
      if (near.length === 2) {
        const a1 = Math.atan2(py[near[0].v.i] - ptr.y, px[near[0].v.i] - ptr.x);
        const a2 = Math.atan2(py[near[1].v.i] - ptr.y, px[near[1].v.i] - ptr.x);
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

  /* ---------- 玻璃 ---------- */

  const drawGlass = () => {
    glass.globalCompositeOperation = 'source-over';
    glass.clearRect(0, 0, W, H);
    /* 雾要够厚，擦开才有反差；但不能厚到雾态是一片空白 ——
       没擦的地方也要看得见标本的影子。 */
    glass.fillStyle = 'rgba(247,248,247,0.83)';
    glass.fillRect(0, 0, W, H);
    glass.globalAlpha = 0.52;
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
  };

  /* ---------- 读数 ----------
     卷宗本来就有读数栏，所以不是装饰，是同一套语言。
     一直在跳的数字是画面「活着」的一部分。 */
  const SPEC_ID = `RT-${String(nseed).padStart(4, '0')}`;
  let telAt = 0;
  const clock = (ms) => {
    const cs = (ms / 10) | 0;
    const p2 = (v) => String(v).padStart(2, '0');
    return `${p2(((cs / 6000) | 0) % 60)}:${p2(((cs / 100) | 0) % 60)}:${p2(cs % 100)}`;
  };
  const telemetry = (now) => {
    if (!elTel || now - telAt < 100) return;
    telAt = now;
    let bif = 0;
    for (let i = 0; i < count; i++) if (kids[i] && kids[i].length > 1) bif++;
    const y = ((yaw % 6.283) + 6.283) % 6.283;
    elTel.textContent = [
      `SPECIMEN   ${SPEC_ID}`,
      `STATE      ${growing ? 'PERFUSING…' : 'STABLE'}`,
      `VESSELS    ${count}`,
      `BIFURC     ${bif}`,
      `YAW/PITCH  ${y.toFixed(2)} / ${pitch.toFixed(2)} RAD`,
      `FLOW       ${(PULSE_SPEED * (1 + Math.sin(now * 0.0013) * 0.06)).toFixed(2)} mm·s-1`,
      `CLARITY    ${(maxClear * 100).toFixed(1)} %`,
      `FRAME      ${fpsAvg.toFixed(1)} ms`,
      `UTIME      ${clock(now)}`,
    ].join('\n');
  };

  /* ---------- 每帧 ---------- */

  /* 每帧要投影一万三千节血管加一万两千个点。
     机器吃不消的时候先把点云砍半 —— 首屏卡顿比少一点颗粒糟得多。
     只降一次，不来回抖。 */
  let fpsAvg = 16, lastNow = 0, degraded = false;

  const frame = (now) => {
    /* 被浏览器挂起（切后台、面板隐藏）时帧间隔会到几百毫秒。
       那种帧不能计入平均，否则假卡顿会把画质降下去再也不升回来。
       真卡顿在 20–40ms 这一档，50ms 以上一律当成挂起丢掉。 */
    const dt = now - lastNow;
    if (lastNow && dt > 0 && dt < 50) {
      fpsAvg += (dt - fpsAvg) * 0.05;
      if (!degraded && fpsAvg > 26 && now > 5000) { degraded = true; dotN = (dotN / 2) | 0; }
    }
    lastNow = now;

    const calm = now - lastMove > CALM_DELAY;
    live += ((ptr.active && !calm && !ptr.down ? 1 : 0) - live) * 0.1;

    /* 按住拖 = 转标本；只是移动 = 擦玻璃。
       一个手势干两件事会打架，分开给最省解释。 */
    if (ptr.down) {
      vyaw = dragX * 0.005;
      vpitch = dragY * 0.004;
      yaw += vyaw;
      pitch = Math.max(-1.15, Math.min(1.15, pitch + vpitch));
      dragX = 0; dragY = 0;
    } else {
      yaw += vyaw + SPIN * 0.016;     // 松手后接着滑，然后落到匀速自转
      pitch = Math.max(-1.15, Math.min(1.15, pitch + vpitch));
      vyaw *= 0.94; vpitch *= 0.94;
      if (ptr.active && !calm) wipe();
    }
    setCam();

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
    projectAll();
    drawSpecimen();
    drawGlass();
    drawTool();
    telemetry(now);
    raf = requestAnimationFrame(frame);
  };

  /* ---------- 交互 ---------- */

  const toLocal = (e) => {
    const r = elTool.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (ptr.down) { dragX += x - ptr.x; dragY += y - ptr.y; }
    if (!ptr.active) { ptr.px = x; ptr.py = y; }
    ptr.x = x; ptr.y = y;
  };

  elTool.addEventListener('pointermove', (e) => {
    toLocal(e); ptr.active = true; lastMove = performance.now();
  });
  elTool.addEventListener('pointerdown', (e) => {
    const r = elTool.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
    ptr.px = ptr.x; ptr.py = ptr.y;
    ptr.down = true; ptr.active = true;
    lastMove = performance.now();
    elTool.style.cursor = 'grabbing';
    elTool.setPointerCapture?.(e.pointerId);
  });
  const release = () => { ptr.down = false; elTool.style.cursor = ''; };
  elTool.addEventListener('pointerup', release);
  elTool.addEventListener('pointercancel', release);
  elTool.addEventListener('pointerleave', () => { release(); ptr.active = false; });

  /* ---------- 启动 ---------- */

  let started = false;

  const start = () => {
    if (!resize()) return;
    setCam();
    if (reduced) {
      /* 尊重系统设置：长完、画一张静止的，不转也不搏动 */
      while (growing) growStep();
      projectAll(); drawSpecimen(); drawGlass(); drawTool();
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
      setCam();
      if (reduced) {
        while (growing) growStep();
        projectAll(); drawSpecimen(); drawGlass(); drawTool();
      }
    }, 220);
  });
  ro.observe(elTool);

  document.addEventListener('visibilitychange', () => {
    if (reduced) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) { lastNow = 0; raf = requestAnimationFrame(frame); }
  });
}
