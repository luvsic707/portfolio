/* 把 a-lockups.png 拆成三张独立的组合图。
 *
 * 为什么拆：这张图不是被切，是三行各自停在不同位置 ——
 * 量出来第一行的墨到 x1594（画布 84%），第二行 1867（98%），
 * 第三行 1899（100%）。三行左右都不对齐，整张读起来就像裁坏了。
 * （我先前用「边缘带墨比例」判它被切，是假阳性：几何构形的笔画
 *   末端本来就是平的，紧裁后自然贴边。拿确定完整的 Asset 8 对过
 *   第三行，比例差 0.002，一笔没少。）
 *
 * 拆开之后每行各自去透明边、各自定宽，就都是有意为之的规范图，
 * 而不是一张裁坏的拼图。
 *
 * 三行按等高排，不按等宽：组合图的可比量是字高，
 * 等宽会让 3.6 比例的那行矮成一条线。
 */
const sharp = require('sharp');

const SRC = 'src/content/projects/nuo2/a-lockups.png';
const OUTDIR = 'src/content/projects/nuo2';
const SP = '/private/tmp/claude-501/-Users-macbookpro-projects-portfolio/ab00b39d-2308-4589-8330-0c09d2a70234/scratchpad';

/* 横向墨带，先前扫出来的 */
const BANDS = [
  { name: 'a-lockup-1', top: 0, height: 416 },
  { name: 'a-lockup-2', top: 492, height: 531 },
  { name: 'a-lockup-3', top: 1109, height: 513 },
];

(async () => {
  const m = await sharp(SRC).metadata();
  console.log(`源 ${m.width}x${m.height}`);
  const made = [];
  for (const b of BANDS) {
    const strip = { left: 0, top: b.top, width: m.width, height: b.height };

    /* 不用 sharp 的 trim：它按「和左上角像素的差」切，而右边有一圈
       alpha 1-40 的抗锯齿余晖，阈值 1 的 trim 会把那圈留着 ——
       三行都切不掉，全是 1900 宽。自己按 alpha 阈值算框。 */
    const { data, info } = await sharp(SRC).extract(strip).ensureAlpha()
      .raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = info;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (data[(y * W + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }

    const buf = await sharp(SRC)
      .extract({ left: x0, top: b.top + y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
      .png({ compressionLevel: 9 }).toBuffer();
    const mm = await sharp(buf).metadata();
    await sharp(buf).toFile(`${OUTDIR}/${b.name}.png`);
    made.push({ ...b, w: mm.width, h: mm.height, r: mm.width / mm.height });
    console.log(`${b.name}.png  ${mm.width}x${mm.height}  比例 ${(mm.width / mm.height).toFixed(3)}  ` +
      `（源里这行的墨到 x${x1}，画布宽 ${W}）`);
  }

  /* 按等高算每行该占版心的百分之几。
     以最宽的那行占 88% 为准，其余按比例缩 —— 这样三行字高一致。 */
  /* 基准 80% 而不是 88%：最宽那行只有 1595px，在 88%（873 槽位）上是
     0.91 倍放大。80% 给 794 的槽位，要 1588，刚好够。 */
  const MEASURE = 992, LEAD = 0.80;
  const widest = made.reduce((a, b) => (b.r > a.r ? b : a));
  const unitH = (MEASURE * LEAD) / widest.r;
  console.log(`\n等高排：行高统一 ${Math.round(unitH)}px（以最宽那行占 ${LEAD * 100}% 为准）`);
  for (const d of made) {
    const wPct = (unitH * d.r) / MEASURE * 100;
    const cssW = Math.round(MEASURE * wPct / 100);
    console.log(`  ${d.name}  --w: ${wPct.toFixed(0)}%  → ${cssW}px 宽  ` +
      `需 ${cssW * 2} 物理像素，有 ${d.w}  ${d.w >= cssW * 2 ? '够' : '不够 ' + (d.w / (cssW * 2)).toFixed(2) + 'x'}`);
  }

  /* 预览：按算出来的宽度叠一遍，看字高是不是真的齐 */
  const PW = 900, tiles = [];
  let y = 14;
  for (const d of made) {
    const w = Math.round(PW * 0.88 * (d.r / widest.r));
    const buf = await sharp(`${OUTDIR}/${d.name}.png`).resize({ width: w })
      .flatten({ background: '#FFE7C2' }).png().toBuffer();
    const mm = await sharp(buf).metadata();
    tiles.push({ input: buf, left: Math.round((PW - w) / 2), top: y });
    y += mm.height + 26;
  }
  await sharp({ create: { width: PW, height: y, channels: 3, background: '#FFE7C2' } })
    .composite(tiles).jpeg({ quality: 92 }).toFile(`${SP}/v-lockups3.jpg`);
  console.log('\n预览 v-lockups3.jpg');
})();
