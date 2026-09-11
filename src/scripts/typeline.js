/* ============================================================
   终端打字 —— Red Thread Rehab

   文字先由服务端整段渲染出来（SEO 和读屏器拿到的是完整的句子），
   脚本开跑时才把它清空、再一个字一个字敲回去。
   不是用 JS 拼字符串 —— 那样源码里没有内容。

   清空之前先量一次每行的高度并锁住，否则行会塌掉，
   打字过程中整块文案会一直往下顶。

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

  for (const p of plan) {
    p.el.style.minHeight = `${p.el.offsetHeight}px`;   // 先锁高度再清空
    for (const s of p.segs) s.node.nodeValue = '';
  }
  root.classList.add('is-typing');

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
      let left = n;
      for (const s of p.segs) {
        const take = Math.max(0, Math.min(s.text.length, left));
        if (s.node.nodeValue.length !== take) s.node.nodeValue = s.text.slice(0, take);
        left -= take;
      }
      if (n > 0 && n < p.len) cursorOn = p;
    }

    for (const p of plan) p.el.classList.toggle('is-caret', p === cursorOn);

    if (t < at) requestAnimationFrame(tick);
    else root.classList.add('is-done');
  };
  requestAnimationFrame(tick);
}
