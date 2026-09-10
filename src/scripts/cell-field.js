/* ============================================================
   首屏细胞场 —— Red Thread Rehab

   参考的是植物茎横切片和水彩显微图：多边形细胞、共享的厚壁、
   湿润的边缘、大片留白。所以不能用圆形粒子 —— 圆读不出「组织」，
   必须画真正的 Voronoi 多边形，再把角磨圆才有生物感。

   两张平滑的场决定这片组织长什么样：
     · 疏密场 —— 控制种子间距，所以细胞大小是渐变的，不是随机跳的
     · 深浅场 —— 控制每个细胞吃多少色，成片的深细胞压出画面的黑白关系
   都用低频谐波，所以永远是和谐的一团，不会出现突兀的密簇
   （密簇的边上会长出楔形长条，那是显微图里没有、看着像 bug 的东西）。

   静止时靠质心松弛（Lloyd）抹平抖动；
   拖拽时被推开并增殖；手一停就慢慢收回、多余的细胞被吸收。
   ============================================================ */

const RED = [193, 26, 52];      // 主体色，比 --red 稍暖一点，成片铺开才不刺
const DEEP = [116, 14, 34];     // 壁和核，接近干掉的胭脂

const REST = 148;               // 安静时的细胞数
const MAX = 260;                // 增殖上限
const NEIGHBOURS = 11;          // 参与切割的邻居数，够画出共享壁了
const GHOSTS = 52;              // 场外的虚拟点，用来给最外圈细胞封边

const CALM_DELAY = 1200;        // 手停多久开始平复（毫秒）
const PUSH_RADIUS = 190;
const PUSH_FORCE = 4.2;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initCellField(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1;
  let cx = 0, cy = 0, rx = 0, ry = 0;   // 细胞群所在的椭圆
  let cells = [];
  let ghosts = [];
  let noise = null;
  let dens = () => 0.5;                 // 疏密场
  let tone = () => 0.5;                 // 深浅场
  const lobe = rand(0, Math.PI * 2);    // 这一次加载的边界形状

  /* 轮廓：一圈谐波揉出来的裂片。
     播种、封边、淡出全都走它 —— 只要有一处还在用正椭圆算，
     轮廓就会被那一处重新拉回成圆。 */
  const shape = (a) => 1
    + Math.sin(a + lobe) * 0.1
    + Math.sin(a * 2 - lobe * 1.3) * 0.15
    + Math.sin(a * 3 + lobe * 0.7) * 0.1
    + Math.sin(a * 5 - lobe * 2.1) * 0.05;

  let pointer = { x: -1e4, y: -1e4, down: false, active: false };
  let lastMove = -1e9;
  let raf = 0;

  /* ---------- 尺寸 ---------- */

  /* 容器还没有尺寸时（面板隐藏、字体未落定、首帧之前）先不画，
     等 ResizeObserver 报来真实尺寸再启动 —— 否则整场会塌成 1px。 */
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* 细胞群不铺满屏 —— 留白是构图的一部分 */
    const narrow = W < 760;
    cx = narrow ? W * 0.5 : W * 0.7;
    cy = narrow ? H * 0.4 : H * 0.5;
    const base = Math.min(W, H);
    /* 轮廓的谐波最多能把半径撑到 1.4 倍，所以基准半径要按撑开后
       仍然碰不到上下边来定 —— 撑到出血就没有留白了 */
    rx = narrow ? base * 0.42 : base * 0.35;
    ry = narrow ? base * 0.36 : base * 0.34;

    buildGhosts();
    if (!noise) noise = makeNoise();
    return true;
  };

  /* ---------- 两张低频场 ----------
     三个正弦谐波叠出来的平滑起伏，波长跟细胞群同量级，
     所以整片组织上只有两三处「密的地方」和两三处「深的地方」，
     过渡是连续的 —— 这正是显微切片读起来舒服的原因。 */

  const makeField = () => {
    const harm = [];
    for (let i = 0; i < 3; i++) {
      const k = 0.7 + i * 0.8;
      harm.push({
        fx: (rand(0.6, 1.5) * k * Math.PI) / rx,
        fy: (rand(0.6, 1.5) * k * Math.PI) / ry,
        p: rand(0, Math.PI * 2),
        a: 1 / (i + 1),
      });
    }
    const tot = harm.reduce((s, h) => s + h.a, 0);
    return (x, y) => {
      let s = 0;
      for (const h of harm) {
        s += h.a * Math.sin((x - cx) * h.fx + (y - cy) * h.fy + h.p);
      }
      return 0.5 + 0.5 * (s / tot);
    };
  };

  /* ---------- 播种 ---------- */

  const newCell = (x, y, opts = {}) => {
    /* 深浅：场值先取幂，把分布压向浅色 —— 深细胞是少数派才成得了画面的重音。
       再乘一点个体随机，免得深浅变成一块干净的渐变，那就不像细胞了。 */
    let raw = clamp01(tone(x, y) * rand(0.8, 1.2));
    /* 十几个细胞里有一个是「染上了」的重音 —— 全靠平滑场的话，
       深浅会变成一块干净的渐变，那是渲染，不是切片 */
    if (Math.random() < 0.07) raw = clamp01(raw + rand(0.3, 0.55));
    const shade = 0.05 + 0.87 * Math.pow(raw, 1.7);
    return {
      x, y,
      hx: x, hy: y,               // 家的位置，平复时回这儿
      vx: 0, vy: 0,
      born: performance.now(),
      life: 1,                    // 1 = 常驻；<1 的是增殖出来的，会被吸收
      seed: rand(0, 1000),
      shade,
      nucleus: shade > 0.42 && Math.random() < 0.55,
      /* 一点点色相漂移：多数偏正红，少数偏暖橙或冷紫，整体才不呆板 */
      tint: Math.random() < 0.12 ? rand(-1, 1) : rand(-0.3, 0.3),
      poly: null,
      ...opts,
    };
  };

  /* Mitchell 最佳候选采样：每放一个点，扔十个候选，
     取「离已有点最远 × 该处密度」得分最高的那个。
     得到的是带密度梯度的蓝噪声 —— 间距平滑地变，所以细胞大小平滑地变，
     不会像随机撒点那样出现细长的楔子。 */
  const seedField = () => {
    dens = makeField();
    tone = makeField();
    cells = [];

    const pts = [];
    for (let i = 0; i < REST; i++) {
      let best = null, bestScore = -1;
      const tries = i < 3 ? 1 : 10;
      for (let j = 0; j < tries; j++) {
        const a = rand(0, Math.PI * 2);
        const rr = Math.sqrt(Math.random()) * shape(a);
        const x = cx + Math.cos(a) * rx * rr;
        const y = cy + Math.sin(a) * ry * rr;
        let md = 1e4;
        for (const p of pts) {
          const d = Math.hypot(x - p[0], y - p[1]);
          if (d < md) md = d;
        }
        /* 密度高的地方，同样的间距得分更高 → 点会挤过去。
           权重跨度约 3 倍，也就是最大最小细胞的面积差近一个数量级 ——
           拉不开这个差距，整片就读成绣球花瓣。 */
        const score = md * (0.22 + 1.9 * dens(x, y));
        if (score > bestScore) { bestScore = score; best = [x, y]; }
      }
      pts.push(best);
      cells.push(newCell(best[0], best[1]));
    }
  };

  /* 场外一圈虚拟点：只参与切割不画，
     否则最外圈细胞的 Voronoi 区域会无限延伸、糊到屏幕边上 */
  const buildGhosts = () => {
    ghosts = [];
    for (let i = 0; i < GHOSTS; i++) {
      const a = (i / GHOSTS) * Math.PI * 2;
      const k = shape(a) * 1.14;
      ghosts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
    }
  };

  /* ---------- Voronoi ----------
     对每个细胞，用一个大矩形去被最近的若干邻居的中垂线依次切。
     Sutherland–Hodgman 裁剪，够快也够准。 */

  const clipHalfPlane = (poly, mx, my, nx, ny) => {
    const out = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % n];
      const da = (ax - mx) * nx + (ay - my) * ny;
      const db = (bx - mx) * nx + (by - my) * ny;
      if (da <= 0) out.push([ax, ay]);
      if ((da <= 0) !== (db <= 0)) {
        const t = da / (da - db);
        out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      }
    }
    return out;
  };

  const computePolys = () => {
    const pad = Math.max(W, H);
    const all = cells.concat(ghosts);
    /* 单个细胞的半径上限 ≈ 2.4 倍平均间距 */
    const capR = 2.4 * Math.sqrt((Math.PI * rx * ry) / Math.max(1, cells.length));

    for (const c of cells) {
      /* 先按距离挑最近的邻居 —— 只有它们能真正切到这个细胞 */
      const near = [];
      for (const o of all) {
        if (o === c) continue;
        const dx = o.x - c.x, dy = o.y - c.y;
        const d2 = dx * dx + dy * dy;
        if (near.length < NEIGHBOURS) {
          near.push({ o, d2 });
          if (near.length === NEIGHBOURS) near.sort((p, q) => p.d2 - q.d2);
        } else if (d2 < near[NEIGHBOURS - 1].d2) {
          near[NEIGHBOURS - 1] = { o, d2 };
          near.sort((p, q) => p.d2 - q.d2);
        }
      }

      let poly = [
        [c.x - pad, c.y - pad], [c.x + pad, c.y - pad],
        [c.x + pad, c.y + pad], [c.x - pad, c.y + pad],
      ];
      for (const { o } of near) {
        const nx = o.x - c.x, ny = o.y - c.y;
        poly = clipHalfPlane(poly, (c.x + o.x) / 2, (c.y + o.y) / 2, nx, ny);
        if (poly.length < 3) break;
      }

      /* 再用一个正八边形封顶。
         跑到群体外的细胞，最近的几个邻居围不住它，区域会拉成一根长刺 ——
         封了半径就永远不会。 */
      if (poly.length >= 3) {
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const nx = Math.cos(a), ny = Math.sin(a);
          poly = clipHalfPlane(poly, c.x + nx * capR, c.y + ny * capR, nx, ny);
          if (poly.length < 3) break;
        }
      }
      c.poly = poly.length >= 3 ? poly : null;
    }
  };

  const centroid = (poly) => {
    let a = 0, x = 0, y = 0;
    for (let i = 0; i < poly.length; i++) {
      const [x0, y0] = poly[i];
      const [x1, y1] = poly[(i + 1) % poly.length];
      const f = x0 * y1 - x1 * y0;
      a += f; x += (x0 + x1) * f; y += (y0 + y1) * f;
    }
    if (Math.abs(a) < 1e-6) return null;
    a *= 0.5;
    return [x / (6 * a), y / (6 * a)];
  };

  /* ---------- 动力学 ---------- */

  const step = (now) => {
    const calm = now - lastMove > CALM_DELAY;

    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i];

      /* 质心松弛只用来抹掉抖动，力道要小 ——
         它的终点是「处处一样大」，而蓝噪声播种要的正是大小有别，
         所以让回家的弹簧比它强一倍，疏密才留得住。 */
      if (c.poly) {
        const m = centroid(c.poly);
        if (m) {
          const k = calm ? 0.014 : 0.012;
          c.vx += (m[0] - c.x) * k;
          c.vy += (m[1] - c.y) * k;
        }
      }

      /* 回家的弹簧，只在平复时明显 */
      if (calm) {
        c.vx += (c.hx - c.x) * 0.03;
        c.vy += (c.hy - c.y) * 0.03;
      }

      /* 指针推开 */
      if (pointer.active) {
        const dx = c.x - pointer.x, dy = c.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < PUSH_RADIUS && d > 0.01) {
          const f = (1 - d / PUSH_RADIUS) ** 2 * PUSH_FORCE;
          c.vx += (dx / d) * f;
          c.vy += (dy / d) * f;
        }
      }

      /* 极缓的呼吸漂移，静止时也不死板 */
      const t = now * 0.00013;
      c.vx += Math.cos(t + c.seed) * 0.011;
      c.vy += Math.sin(t * 1.17 + c.seed) * 0.011;

      c.vx *= calm ? 0.85 : 0.92;
      c.vy *= calm ? 0.85 : 0.92;
      c.x += c.vx;
      c.y += c.vy;

      /* 增殖出来的细胞：平静后慢慢被吸收 */
      if (c.life < 1) {
        c.life += calm ? -0.006 : 0.02;
        if (c.life <= 0) { cells.splice(i, 1); continue; }
        c.life = Math.min(c.life, 1);
      }

      /* 别跑出场外太远 —— 边界跟着裂片走，不是正椭圆 */
      const bound = shape(Math.atan2(c.y - cy, c.x - cx)) * 1.08;
      const ex = (c.x - cx) / (rx * bound);
      const ey = (c.y - cy) / (ry * bound);
      const e = Math.hypot(ex, ey);
      if (e > 1) {
        c.vx -= ex * (e - 1) * 0.9;
        c.vy -= ey * (e - 1) * 0.9;
      }
    }
  };

  /* 拖拽时在指针附近增殖。
     两条限制缺一不可：按时间限速，且新细胞不能离旧细胞太近。
     少了它们，一次拖拽会往几十像素里塞进上百个点，
     Voronoi 把那片切成一团亚像素的网 —— 看着像划破了，不像增殖。 */
  let lastSpawn = 0;

  const spawn = (now) => {
    if (cells.length >= MAX || now - lastSpawn < 55) return;
    const sep = Math.sqrt((Math.PI * rx * ry) / Math.max(1, cells.length)) * 0.62;
    for (let t = 0; t < 8; t++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(sep, PUSH_RADIUS * 0.7);
      const x = pointer.x + Math.cos(a) * d;
      const y = pointer.y + Math.sin(a) * d;
      let ok = true;
      for (const o of cells) {
        if (Math.hypot(o.x - x, o.y - y) < sep) { ok = false; break; }
      }
      if (!ok) continue;

      const c = newCell(x, y);
      /* 新细胞的「家」落在场内，平复时才有地方回 */
      const ha = rand(0, Math.PI * 2);
      const hr = Math.sqrt(rand(0, 1)) * shape(ha);
      c.hx = cx + Math.cos(ha) * rx * hr;
      c.hy = cy + Math.sin(ha) * ry * hr;
      c.life = 0.3;
      cells.push(c);
      lastSpawn = now;
      return;
    }
  };

  /* ---------- 绘制 ---------- */

  /* 一次性生成的噪点，叠在最上面做纸纹。
     对比度必须很低 —— canvas 铺满整屏，噪点一深，
     首屏和下面的版面之间就会出现一条看得见的接缝。 */
  function makeNoise() {
    const s = 220;
    const off = document.createElement('canvas');
    off.width = off.height = s;
    const c2 = off.getContext('2d');
    const img = c2.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 247 + Math.random() * 8;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    c2.putImageData(img, 0, 0);
    return off;
  }

  /* 只把顶点磨成圆角，边还是直的。
     之前是让曲线穿过各边中点，那等于把整个多边形吹成一个圆鼓的团 ——
     一片圆鼓的团读起来是花瓣，不是共用细胞壁的组织。
     顶点上再加一点随每个细胞固定的正弦抖动，壁才不是尺子画的。 */
  const tracePoly = (c, k, rr) => {
    const poly = c.poly;
    const n = poly.length;
    const p = [];
    for (let i = 0; i < n; i++) {
      const vx = poly[i][0] - c.x, vy = poly[i][1] - c.y;
      const w = 1 - k + Math.sin(c.seed + i * 2.399) * 0.022;
      p.push([c.x + vx * w, c.y + vy * w]);
    }

    /* 圆角只到边长的一小截。磨大了每个格子都缩成一颗鹅卵石，
       格子和格子之间在角上裂出纸色的缝，又变回马赛克。 */
    const maxR = rr * 0.15;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const cur = p[i], prev = p[(i - 1 + n) % n], next = p[(i + 1) % n];
      const v1x = prev[0] - cur[0], v1y = prev[1] - cur[1];
      const v2x = next[0] - cur[0], v2y = next[1] - cur[1];
      const l1 = Math.hypot(v1x, v1y) || 1;
      const l2 = Math.hypot(v2x, v2y) || 1;
      const r = Math.min(l1 * 0.45, l2 * 0.45, maxR);
      const ax = cur[0] + (v1x / l1) * r, ay = cur[1] + (v1y / l1) * r;
      const bx = cur[0] + (v2x / l2) * r, by = cur[1] + (v2y / l2) * r;
      if (i === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
      ctx.quadraticCurveTo(cur[0], cur[1], bx, by);
    }
    ctx.closePath();
  };

  const draw = (now) => {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply';
    ctx.lineJoin = 'round';

    /* 整片组织底下垫一层极淡的玫瑰晕，把散开的细胞收成一个整体 */
    const wash = ctx.createRadialGradient(cx, cy, rx * 0.15, cx, cy, rx * 1.15);
    wash.addColorStop(0, `rgba(${RED[0]},${RED[1]},${RED[2]},0.055)`);
    wash.addColorStop(0.7, `rgba(${RED[0]},${RED[1]},${RED[2]},0.028)`);
    wash.addColorStop(1, `rgba(${RED[0]},${RED[1]},${RED[2]},0)`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    for (const c of cells) {
      if (!c.poly) continue;

      /* 越靠外越淡，边缘化进白底里 —— 留白是画的一部分。
         淡出的门槛按裂片轮廓算，用正椭圆的话轮廓会被这一步拉回成圆。 */
      const ex = (c.x - cx) / rx, ey = (c.y - cy) / ry;
      const out = Math.hypot(ex, ey);
      const fade = clamp01((shape(Math.atan2(c.y - cy, c.x - cx)) * 1.02 - out) / 0.3);
      const a = fade * c.life;
      if (a <= 0.02) continue;

      const s = c.shade;

      /* 按色相漂移把红往暖橙 / 冷紫两侧推一点 */
      const tw = c.tint;
      /* 越深的细胞越往胭脂里走，浅的留在朱红 —— 一条色相上有起伏的红，
         比同一个红调透明度更像颜料 */
      const mix = s * 0.34;
      const col = [
        RED[0] + (DEEP[0] - RED[0]) * mix + tw * 20,
        RED[1] + (DEEP[1] - RED[1]) * mix + (tw > 0 ? tw * 44 : tw * 6),
        RED[2] + (DEEP[2] - RED[2]) * mix + (tw < 0 ? -tw * 54 : -tw * 8),
      ].map((v) => Math.max(0, Math.min(255, Math.round(v))));
      const rgb = `${col[0]},${col[1]},${col[2]}`;

      let rr = 0;
      for (const v of c.poly) rr = Math.max(rr, Math.hypot(v[0] - c.x, v[1] - c.y));

      /* 收得极浅。收多了细胞之间会露出纸色的缝，整片就成了马赛克 ——
         真正的组织没有缝，相邻两个细胞共用一堵墙，
         所以让两边的描边叠在同一条线上，墙自己就加深了。 */
      const wob = 0.012 + Math.sin(now * 0.0006 + c.seed) * 0.006;
      tracePoly(c, wob, rr);

      /* 细胞质：颜料往边上沉（真水彩就是这样干的），
         受光点略微偏心，一格一格地偏 —— 不能是正中的白点，
         正中的白点会让整片读成气泡膜。 */
      const gx = c.x + Math.cos(c.seed) * rr * 0.13;
      const gy = c.y + Math.sin(c.seed * 1.7) * rr * 0.13;
      /* 内外差别要小 —— 差别一大，每个细胞就有了高光，一片高光读成塑料。
         只留一点点「颜料往边上沉」的痕迹就够。 */
      const g = ctx.createRadialGradient(gx, gy, rr * 0.1, c.x, c.y, rr * 1.05);
      g.addColorStop(0, `rgba(${rgb},${0.62 * s * a})`);
      g.addColorStop(0.6, `rgba(${rgb},${0.76 * s * a})`);
      g.addColorStop(1, `rgba(${rgb},${s * a})`);
      ctx.fillStyle = g;
      ctx.fill();

      /* 壁：一道干净的细线定形状，深细胞再压一道让它站住 */
      ctx.strokeStyle = `rgba(${DEEP[0]},${DEEP[1]},${DEEP[2]},${(0.15 + s * 0.45) * a})`;
      ctx.lineWidth = 0.8 + s * 0.7;
      ctx.stroke();
      if (s > 0.45) {
        ctx.strokeStyle = `rgba(${DEEP[0]},${DEEP[1]},${DEEP[2]},${0.1 * s * a})`;
        ctx.lineWidth = 3.4;
        ctx.stroke();
      }

      /* 细胞核：只给深细胞，密度上才有疏密 */
      if (c.nucleus) {
        const nr = Math.max(1.5, rr * 0.15);
        const ng = ctx.createRadialGradient(gx, gy, 0, gx, gy, nr);
        ng.addColorStop(0, `rgba(${DEEP[0]},${DEEP[1]},${DEEP[2]},${0.5 * a})`);
        ng.addColorStop(1, `rgba(${DEEP[0]},${DEEP[1]},${DEEP[2]},0)`);
        ctx.fillStyle = ng;
        ctx.beginPath();
        ctx.arc(gx, gy, nr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* 纸纹 */
    if (noise) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = ctx.createPattern(noise, 'repeat');
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  /* ---------- 主循环 ---------- */

  const frame = (now) => {
    step(now);
    computePolys();
    draw(now);
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
    if (pointer.down) spawn(lastMove);
  });

  canvas.addEventListener('pointerdown', (e) => {
    toLocal(e);
    pointer.down = true;
    pointer.active = true;
    lastMove = performance.now();
    spawn(lastMove);
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
    if (!resize()) return;          // 还没有尺寸，等下一次通知
    seedField();
    computePolys();
    if (reduced) {
      /* 尊重系统设置：松弛几步，画一张静止的组织切片 */
      for (let i = 0; i < 60; i++) { step(performance.now()); computePolys(); }
      draw(performance.now());
    } else if (!raf) {
      raf = requestAnimationFrame(frame);
    }
    started = true;
  };

  start();

  /* 容器尺寸变了就重排。宽高变化不大就只把整群平移到新的场心，
     不重新播种 —— 免得读者调一下窗口整片组织就重来。 */
  let rt = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (!started) { start(); return; }
      const b = { w: W, h: H, cx, cy };
      if (!resize()) return;
      const big = Math.abs(W - b.w) > b.w * 0.2 || Math.abs(H - b.h) > b.h * 0.2;
      if (big) { seedField(); }
      else {
        const dx = cx - b.cx, dy = cy - b.cy;
        for (const c of cells) {
          c.hx += dx; c.hy += dy;
          c.x += dx; c.y += dy;
        }
      }
      computePolys();
      if (reduced) draw(performance.now());
    }, 140);
  });
  ro.observe(canvas);

  /* 页面切到后台就停，别空转烧电 */
  document.addEventListener('visibilitychange', () => {
    if (reduced) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) raf = requestAnimationFrame(frame);
  });
}
