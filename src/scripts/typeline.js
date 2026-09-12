/* ============================================================
   终端打字 —— Red Thread Rehab

   文字先由服务端整段渲染出来（SEO 和读屏器拿到的是完整的句子），
   脚本开跑时才把它清空、再一个字一个字敲回去。
   不是用 JS 拼字符串 —— 那样源码里没有内容。

   清空之前先量一次每行的高度并锁住，否则行会塌掉，
   打字过程中整块文案会一直往下顶。锁的是像素值，所以宽度一变就得
   重新量，敲完了就该松开 —— 详见下面 lock()。

   用时间推进不是按帧推进：掉帧的机器上速度才不会变慢。
   ============================================================ */

const CPS = 82;                 // 每秒敲多少个字
const LINE_GAP = 130;           // 行与行之间停多久（毫秒）
const START_DELAY = 260;

export function typeTerminal(root) {
  if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lines = [...root.querySelectorAll('[data-line]')];
  if (!lines.length) return;

  if (reduced) { root.classList.add('is-done'); return; }

  /* 每行拆成若干文本节点。这样行内的 <span class="hl"> 之类
     不用管，颜色和标记都原样保留。 */
  const plan = lines.map((el) => {
    const segs = [];
    (function walk(n) {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) segs.push({ node: c, text: c.nodeValue });
        else walk(c);
      }
    })(el);
    return { el, segs, len: segs.reduce((a, s) => a + s.text.length, 0) };
  });

  /* 把某一行显示到第 n 个字 */
  const show = (p, n) => {
    let left = n;
    for (const s of p.segs) {
      const take = Math.max(0, Math.min(s.text.length, left));
      if (s.node.nodeValue.length !== take) s.node.nodeValue = s.text.slice(0, take);
      left -= take;
    }
  };

  /* 量下每行占多高、锁住，行才不会在清空后塌掉、把整块文案一路往上顶。
     量之前得先把整句放回去：量「敲到一半」的行会锁在一个偏矮的值上，
     后面敲出来的字照样把行顶开。
     写和读分开两轮走，别让浏览器为每个元素各重排一次。 */
  const lock = () => {
    for (const p of plan) { show(p, p.len); p.el.style.minHeight = ''; }
    for (const p of plan) p.el.style.minHeight = `${p.el.offsetHeight}px`;
    for (const p of plan) show(p, p.shown || 0);
  };

  let done = false;

  lock();
  root.classList.add('is-typing');

  /* 锁的是一个像素值，而宽度一变，每行折几行就变了 ——
     锁完再换宽度（转屏、拖窗口、面板展开），预留的高度就不对了，
     文案会散开一片。宽度一变就按新宽度重新量。
     只认宽度：改 min-height 会改根元素的高度，跟着高度走会自己触发自己。 */
  let lastW = root.clientWidth;
  const ro = new ResizeObserver(() => {
    if (root.clientWidth === lastW) return;
    lastW = root.clientWidth;
    lock();
  });
  ro.observe(root);

  /* 字体是异步来的。用后备字体量出来的折行数跟正式字体常常不一样。 */
  if (document.fonts) document.fonts.ready.then(() => { if (!done) lock(); });

  /* 排好时间轴：第几毫秒该敲到第几个字 */
  let at = START_DELAY;
  for (const p of plan) {
    p.from = at;
    p.to = at + (p.len / CPS) * 1000;
    at = p.to + LINE_GAP;
  }

  let t0 = 0;
  const tick = (now) => {
    if (!t0) t0 = now;
    const t = now - t0;
    let cursorOn = plan[plan.length - 1];

    for (const p of plan) {
      const n = t <= p.from ? 0
        : t >= p.to ? p.len
        : Math.floor(((t - p.from) / (p.to - p.from)) * p.len);
      if (p.shown === n) { if (n > 0 && n < p.len) cursorOn = p; continue; }
      p.shown = n;
      show(p, n);
      if (n > 0 && n < p.len) cursorOn = p;
    }

    for (const p of plan) p.el.classList.toggle('is-caret', p === cursorOn);

    if (t < at) { requestAnimationFrame(tick); return; }

    /* 敲完了。整句都在位置上，行高本来就是对的 —— 这时候还锁着一个
       写死的像素值，只会在之后换宽度时留下一片空白。松开。 */
    done = true;
    ro.disconnect();
    for (const p of plan) p.el.style.minHeight = '';
    root.classList.add('is-done');
  };
  requestAnimationFrame(tick);
}
