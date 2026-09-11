/* ============================================================
   首屏：细线标本 —— Red Thread Rehab

   这一版推翻了前面两次的做法，理由写在这里，免得以后又绕回去。

   前两版都在用程序「画画」：多边形填色、渐变、假排线。
   程序伪造颜料永远是塑料，凑近看什么都没有。
   参考站（paintriver.art）的做法正相反 —— 它的生成层
   只有单色的细线和小圆点，一层，不填任何色块。

   所以这里也只画线。明暗全部由线的疏密压出来，
   就是版画和 X 光片的逻辑：密处成团，疏处是纸。

   线不是随便甩的，是沿着一个 flow field 走的（Tyler Hobbs 的做法）：
   场是连续的，所以曲线不会互相穿过，会自然地并排、分岔、拧成束。
   这是「看着像画的」和「看着像噪点」之间的全部差别。

   构图上只有一个东西：一个密集的核，触须甩出画面外。
   不是九个一样重的斑点摊在框里 —— 那是随机，不是构图。

   最上面压一层红线检定：直线、端点刻度、厘米标注。
   有机的扫描 + 临床的标注，就是 Contours / Hidden Pain 那张海报的结构。
   ============================================================ */

const RED = '196,22,50';
const INK = '58,52,58';

const CURVES = 1500;            // 细线总数。少了压不出调子
const CHUNK = 110;              // 每帧烘焙多少根 —— 分批画，开屏才不卡
const STEP = 3.2;               // 积分步长
const CALM_DELAY = 1100;
const PX_PER_CM = 5.2;
const NODES = 7;                // 参与量距离的测点

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

export function initHairline(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1;
  let cx = 0, cy = 0, coreR = 0, span = 0;
  let bake = null, bctx = null;
  let drawn = 0;                 // 已经烘焙了多少根
  const fseed = Math.floor(rand(0, 9999));

  let nodes = [];                // 测点：长在触须末端
  let edges = [];
  let cand = [];                 // 烘焙过程中收集的候选末端

  const pointer = { x: -1e4, y: -1e4, down: false, active: false };
  let lastMove = -1e9;
  let live = 0;
  let raf = 0;

  /* ---------- 场 ----------
     纯噪声场，不掺任何辐射项。
     掺了辐射，所有线就都从一个点炸出去，成一个毛球 —— 试过了，很难看。
     纯噪声的场是连续的，所以曲线永远不互相穿过，会自己并排、分岔、
     拧成束。「像画的」和「像噪点」的差别全在这儿。

     形不是靠场造的，是靠播种密度造的：核里密，外面疏。 */
  const angleAt = (x, y) =>
    (fbm(x / (span * 0.5), y / (span * 0.5), fseed) - 0.5) * Math.PI * 4.4;

  /* ---------- 尺寸 ---------- */

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const narrow = W < 760;
    cx = narrow ? W * 0.52 : W * 0.68;
    cy = narrow ? H * 0.34 : H * 0.46;
    span = Math.min(W, H);
    coreR = span * (narrow ? 0.1 : 0.11);

    bake = document.createElement('canvas');
    bake.width = canvas.width;
    bake.height = canvas.height;
    bctx = bake.getContext('2d');
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.lineCap = 'round';
    bctx.globalCompositeOperation = 'multiply';
    drawn = 0;
    cand = [];
    nodes = [];
    edges = [];
    return true;
  };

  /* ---------- 烘焙 ----------
     一根线：从核附近出发，沿场积分若干步，用很低的透明度描一次。
     单看一根几乎看不见，一千五百根叠起来才有调子 —— 这是关键，
     不能用几百根高透明度的线去凑，那是毛，不是排线。 */
  const bakeChunk = () => {
    let made = 0;
    while (made < CHUNK && drawn < CURVES) {
      /* 一簇一起下笔：同一个起点附近，沿着场的法线依次错开，
         所以整簇会大致平行地跑出去，拧成一条带子。
         Hobbs 说的就是这个 —— 一根一根随机撒是噪点，
         成束才有节奏，才像手画的。 */
      const a0 = rand(0, Math.PI * 2);
      const t = Math.pow(Math.random(), 2.0);
      const r0 = coreR * 0.2 + t * span * 0.72;
      const bx = cx + Math.cos(a0) * r0 * 1.15;
      const by = cy + Math.sin(a0) * r0 * 0.95;

      const near = clamp01(1 - r0 / (span * 0.85));
      const count = 4 + Math.floor(Math.random() * 9);
      const gap = rand(1.1, 3.4);
      const steps = Math.round(rand(50, 210));
      const nrm = angleAt(bx, by) + Math.PI / 2;
      const nx = Math.cos(nrm), ny = Math.sin(nrm);
      /* 深墨只占一小撮，用来在红里压出一点冷的重音 */
      const ink = Math.random() < 0.12;
      const base = rand(0.05, 0.13) * (0.25 + near);
      const lw = rand(0.5, 1.3);

      for (let c = 0; c < count && drawn < CURVES; c++) {
        const off = (c - count / 2) * gap + rand(-0.5, 0.5);
        let x = bx + nx * off, y = by + ny * off;

        bctx.strokeStyle = ink
          ? `rgba(${INK},${base * rand(0.5, 0.9)})`
          : `rgba(${RED},${base * rand(0.7, 1.2)})`;
        bctx.lineWidth = lw * rand(0.8, 1.2);
        bctx.beginPath();
        bctx.moveTo(x, y);
        for (let s = 0; s < steps; s++) {
          const ang = angleAt(x, y);
          x += Math.cos(ang) * STEP;
          y += Math.sin(ang) * STEP;
          if (x < -span * 0.6 || x > W + span * 0.6 ||
              y < -span * 0.6 || y > H + span * 0.6) break;
          bctx.lineTo(x, y);
        }
        bctx.stroke();
        drawn++;
        made++;

        /* 顺手收几个末端当候选测点 —— 测点长在线的尽头，
           比在空地上随便摆几个点有意义得多 */
        const dc = Math.hypot(x - cx, y - cy);
        if (drawn % 53 === 0 && dc > span * 0.16 && dc < span * 0.8 &&
            x > W * 0.06 && x < W * 0.95 && y > H * 0.08 && y < H * 0.92) {
          cand.push([x, y]);
        }
      }
    }
    if (drawn >= CURVES) finishBake();
  };

  /* 烘焙完把远处擦掉，让这团东西化进纸里。
     不擦的话边缘是一圈突然断掉的线头，像被裁过。 */
  const finishBake = () => {
    bctx.globalCompositeOperation = 'destination-out';
    const r = span * 1.2;
    const g = bctx.createRadialGradient(cx, cy, r * 0.52, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    bctx.fillStyle = g;
    bctx.fillRect(-span, -span, W + span * 2, H + span * 2);
    bctx.globalCompositeOperation = 'multiply';
    placeNodes();
  };

  /* 从候选里挑彼此离得开的几个当测点 */
  const placeNodes = () => {
    nodes = [];
    for (const c of cand) {
      if (nodes.length >= NODES) break;
      if (nodes.every((p) => Math.hypot(p.x - c[0], p.y - c[1]) > span * 0.2)) {
        nodes.push({ x: c[0], y: c[1], seed: rand(0, 6.283) });
      }
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

  /* ---------- 红线 ---------- */

  const cm = (len) => `${Math.round(len / PX_PER_CM)}cm`;

  const thread = (ax, ay, bx, by, ta, tb, alpha, label) => {
    if (alpha <= 0.015) return;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < ta + tb + 26) return;
    const ux = dx / len, uy = dy / len;
    const x0 = ax + ux * ta, y0 = ay + uy * ta;
    const x1 = bx - ux * tb, y1 = by - uy * tb;

    ctx.strokeStyle = `rgba(${RED},${0.82 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    /* 端点刻度垂直于线 —— 这一笔才让它从「连线」变成「尺寸线」 */
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
    ctx.fillStyle = `rgba(247,248,247,${0.88 * alpha})`;
    ctx.fillRect(-w / 2 - 3, -6, w + 6, 12);
    ctx.fillStyle = `rgba(${RED},${0.95 * alpha})`;
    ctx.fillText(label, 0, 0.5);
    ctx.restore();
  };

  /* ---------- 绘制 ---------- */

  const draw = (now) => {
    if (drawn < CURVES) bakeChunk();

    ctx.clearRect(0, 0, W, H);

    /* 整团极缓地漂。只平移不缩放 —— 缩放会把细线糊掉 */
    const ox = Math.cos(now * 0.00011) * 4;
    const oy = Math.sin(now * 0.00009) * 4;
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(bake, ox, oy, W, H);

    ctx.globalCompositeOperation = 'source-over';
    if (drawn < CURVES) return;   // 还在显影，先不画标注

    /* 测点：一个小圈，像标本上别的针 */
    for (const nd of nodes) {
      ctx.strokeStyle = `rgba(${RED},0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(nd.x + ox, nd.y + oy, 2.6, 0, 6.283);
      ctx.stroke();
    }

    const restA = 0.3 + (1 - live) * 0.7;
    for (const [i, j] of edges) {
      const a = nodes[i], b = nodes[j];
      thread(a.x + ox, a.y + oy, b.x + ox, b.y + oy, 8, 8, restA,
             cm(Math.hypot(b.x - a.x, b.y - a.y)));
    }

    if (live > 0.01) {
      const near = nodes
        .map((s) => ({ s, d: Math.hypot(s.x - pointer.x, s.y - pointer.y) }))
        .sort((p, q) => p.d - q.d)
        .slice(0, 3);
      for (const { s } of near) {
        thread(pointer.x, pointer.y, s.x + ox, s.y + oy, 7, 8, live,
               cm(Math.hypot(s.x + ox - pointer.x, s.y + oy - pointer.y)));
      }
      ctx.strokeStyle = `rgba(${RED},${0.9 * live})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 3.5, 0, 6.283);
      ctx.stroke();

      /* 探针：从指针出发沿着同一个场跑几根短线。
         等于你伸手进去拨了一下，标本顺着自己的纹理散开。 */
      ctx.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 26; i++) {
        const a0 = rand(0, Math.PI * 2);
        const d0 = rand(4, 40);
        let x = pointer.x + Math.cos(a0) * d0;
        let y = pointer.y + Math.sin(a0) * d0;
        ctx.strokeStyle = `rgba(${RED},${rand(0.05, 0.16) * live})`;
        ctx.lineWidth = rand(0.4, 1);
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 26; s++) {
          const ang = angleAt(x, y);
          x += Math.cos(ang) * STEP;
          y += Math.sin(ang) * STEP;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  /* ---------- 主循环 ---------- */

  const frame = (now) => {
    const calm = now - lastMove > CALM_DELAY;
    live += ((pointer.active && !calm ? 1 : 0) - live) * 0.1;
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
      while (drawn < CURVES) bakeChunk();
      draw(performance.now());
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
      /* 尺寸没怎么变就不重画 —— 重画一次要一千五百根线 */
      if (Math.abs(W - b.w) < 2 && Math.abs(H - b.h) < 2) return;
      if (reduced) { while (drawn < CURVES) bakeChunk(); draw(performance.now()); }
    }, 200);
  });
  ro.observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (reduced) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (!raf) raf = requestAnimationFrame(frame);
  });
}
