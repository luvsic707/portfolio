/* ============================================================
   Specimen Glass —— 项目页开屏的观察窗

   首页那块起雾的玻璃搬过来，只是玻璃底下换了标本：
   首页底下是血管，这里底下是作品本身。

   机制和 vascular-window.js 里那套一样，没有重新发明：
     · 一张只存「擦过哪儿」的遮罩（mask），越擦越白
     · 玻璃层把作品重画一遍，挂 CSS 湍流滤镜 = 折射，不是模糊
     · 用 destination-out 拿遮罩在玻璃上打洞，洞里是底下那张清楚的原图

   —— 为什么雾不是半透明的模糊 ——
   半透明的话原图直接透上来，你看到的主要还是没被折射的那一份，
   雾再怎么调都「不明显」。所以玻璃层是不透明地盖死的，
   看得见的清楚只能来自被擦开的洞。

   —— 招聘的人不能被雾挡住 ——
   这是个求职用的站。所以：一滚动雾立刻散、擦够了也散、
   触屏和 reduced-motion 直接不加载。签名重要，但不能挡路。
   ============================================================ */

const BRUSH_R = 104;
const PAPER = 'rgba(247,248,247,0.86)';

const rand = (a, b) => a + Math.random() * (b - a);

export function initSpecimenGlass(root) {
  const stage = root.querySelector('[data-stage]') || root;
  if (!stage) return;

  /* 触屏没有「经过」这个动作，擦不了，只会白白挡住作品 */
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cv = document.createElement('canvas');
  cv.className = 'gl-glass';
  cv.setAttribute('aria-hidden', 'true');
  stage.append(cv);

  const g = cv.getContext('2d');
  const mask = document.createElement('canvas');
  const kctx = mask.getContext('2d');

  let W = 0, H = 0, dpr = 1;
  let rev = null;        // 这一帧要补打的洞的包围盒
  let wiped = 0;         // 擦过多少笔，用来判断「已经看够了」
  let alive = true;

  const size = () => {
    const r = stage.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    dpr = Math.min(2, devicePixelRatio || 1);
    for (const c of [cv, mask]) {
      c.width = W * dpr; c.height = H * dpr;
    }
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    kctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rev = { x0: 0, y0: 0, x1: W, y1: H };   // 尺寸变了，整片重打一次
  };

  /* 当前这一格显示的是图还是视频 —— 擦开之后要能看到正在放的那一格 */
  const subject = () => {
    const on = stage.querySelector('.slide.is-on');
    return on?.querySelector('img, video') || null;
  };

  const blot = (x, y, r, a) => {
    const rg = kctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(255,255,255,${a})`);
    rg.addColorStop(0.6, `rgba(255,255,255,${a * 0.5})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    kctx.fillStyle = rg;
    kctx.beginPath(); kctx.arc(x, y, r, 0, 6.283); kctx.fill();
  };

  /* 手按在玻璃上不是一个圆盘：一小撮偏心的斑 + 一道顺着走向的拖痕。
     洞口的形状由它们定，边缘再交给湍流打碎。 */
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
    const pad = BRUSH_R + 12;
    if (!rev) rev = { x0: x - pad, y0: y - pad, x1: x + pad, y1: y + pad };
    else {
      rev.x0 = Math.min(rev.x0, x - pad); rev.y0 = Math.min(rev.y0, y - pad);
      rev.x1 = Math.max(rev.x1, x + pad); rev.y1 = Math.max(rev.y1, y + pad);
    }
  };

  const punch = () => {
    if (!rev) return;
    const x0 = Math.max(0, rev.x0), y0 = Math.max(0, rev.y0);
    const x1 = Math.min(W, rev.x1), y1 = Math.min(H, rev.y1);
    if (x1 - x0 < 1 || y1 - y0 < 1) return;
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(mask, x0 * dpr, y0 * dpr, (x1 - x0) * dpr, (y1 - y0) * dpr,
                x0, y0, x1 - x0, y1 - y0);
    g.globalCompositeOperation = 'source-over';
  };

  /* 把作品按 cover 画满整块玻璃，和底下那张 object-fit: cover 对齐 */
  const cover = (el) => {
    const sw = el.naturalWidth || el.videoWidth;
    const sh = el.naturalHeight || el.videoHeight;
    if (!sw || !sh) return false;
    const s = Math.max(W / sw, H / sh);
    const w = sw * s, h = sh * s;
    g.drawImage(el, (W - w) / 2, (H - h) / 2, w, h);
    return true;
  };

  const frame = () => {
    if (!alive) return;
    const el = subject();
    g.clearRect(0, 0, W, H);
    if (el && cover(el)) {
      /* 纸色的雾压在这一份折射过的作品上 */
      g.fillStyle = PAPER;
      g.fillRect(0, 0, W, H);
    } else {
      g.fillStyle = 'rgb(247,248,247)';
      g.fillRect(0, 0, W, H);
    }
    punch();
    requestAnimationFrame(frame);
  };

  /* 雾散：擦够了，或者往下滚。
     这是个求职用的站，签名不能挡着人看作品 —— 滚动是所有人都会做的动作，
     它就是那条随时可用的退路。

     一开始还加了「六秒没动就自己散」，删掉了：有人停下来读一眼标题
     就超过六秒，雾在他伸手之前就没了，等于这块玻璃根本没存在过。 */
  const dissolve = () => {
    if (!alive) return;
    alive = false;
    cv.classList.add('is-gone');
    setTimeout(() => cv.remove(), 900);
  };

  const ptr = { x: 0, y: 0, px: 0, py: 0, has: false };

  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (!ptr.has) { ptr.px = x; ptr.py = y; ptr.has = true; }
    else { ptr.px = ptr.x; ptr.py = ptr.y; }
    ptr.x = x; ptr.y = y;

    /* 两帧之间指针可能跳很远，中间要补上，否则擦出来是一串断点 */
    const dx = ptr.x - ptr.px, dy = ptr.y - ptr.py;
    const n = Math.max(1, Math.min(20, Math.ceil(Math.hypot(dx, dy) / 18)));
    for (let i = 1; i <= n; i++) {
      stamp(ptr.px + (dx * i) / n, ptr.py + (dy * i) / n, dx, dy);
    }
    wiped += n;
    if (wiped > 260) dissolve();      // 擦得差不多了就整片让开
  }, { passive: true });

  addEventListener('scroll', () => { if (scrollY > 40) dissolve(); }, { passive: true });

  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(size, 160);
  });

  size();
  requestAnimationFrame(frame);
}
