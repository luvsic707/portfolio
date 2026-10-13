/* NUO2 的项目封面换成外卖袋那张真照片。
 *
 * 原来的 card.jpg 是 928x1232 的主插画 —— 卡片最大档槽位 900px，
 * Retina 上要 1800 物理像素，928 只有 0.52 倍，在首页列表里就是糊的。
 *
 * 取景：卡片是 aspect-ratio 4/3 配 object-fit cover，而袋子本身是竖的
 * （约 2120x2400，比例 0.88）。所以 4:3 的框必须按袋子的高来定宽
 * （2400 x 1.333 = 3200），再留一点气口 —— 反过来按宽定高会把把手和
 * 袋底切掉。
 *
 * 袋子位置是从缩略图读的：x 720-2840，y 1600-4000，于 4000x6000。
 * （亮度检测在这张上不行：左边那片竖纹墙和台面反光都比阈值亮，
 *   框出来是整张。）
 */
const sharp = require('sharp');
const fs = require('fs');

const SRC = '/Users/macbookpro/Desktop/作品集图片/10 NUO2/排版第一次/包装外卖.png';
const OUT = 'src/content/projects/nuo2/card.jpg';
const SP = '/private/tmp/claude-501/-Users-macbookpro-projects-portfolio/ab00b39d-2308-4589-8330-0c09d2a70234/scratchpad';

const BAG = { x0: 720, x1: 2840, y0: 1600, y1: 4000 };
const RATIO = 4 / 3;
const MARGIN = 1.09;      // 袋子外扩 9%，别贴框

(async () => {
  const m = await sharp(SRC).metadata();
  const bh = (BAG.y1 - BAG.y0) * MARGIN;
  const h = Math.round(bh);
  const w = Math.round(h * RATIO);
  const cx = Math.round((BAG.x0 + BAG.x1) / 2), cy = Math.round((BAG.y0 + BAG.y1) / 2);
  const left = Math.max(0, Math.min(m.width - w, cx - Math.round(w / 2)));
  const top = Math.max(0, Math.min(m.height - h, cy - Math.round(h / 2)));

  console.log(`原图 ${m.width}x${m.height}`);
  console.log(`裁 ${w}x${h} (${(w / h).toFixed(3)}) @ ${left},${top}`);
  console.log(`袋子在框内 x ${BAG.x0 - left}-${BAG.x1 - left} y ${BAG.y0 - top}-${BAG.y1 - top}  ` +
    `${BAG.x0 >= left && BAG.x1 <= left + w && BAG.y0 >= top && BAG.y1 <= top + h ? '完整' : '被切'}`);

  await sharp(SRC).extract({ left, top, width: w, height: h })
    .resize(1800, 1350, { fit: 'cover' })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(OUT);

  const mo = await sharp(OUT).metadata();
  console.log(`\n${OUT}  ${mo.width}x${mo.height} (${(mo.width / mo.height).toFixed(3)})  ` +
    `${(fs.statSync(OUT).size / 1024).toFixed(0)}KB  （原来 928x1232 的主插画）`);
  console.log(`  卡片最大档 900 槽位要 1800 物理像素，有 ${mo.width}  ` +
    `${mo.width >= 1800 ? '够' : '不够'}`);

  await sharp(OUT).resize(520).jpeg({ quality: 90 }).toFile(`${SP}/v-card-nuo2.jpg`);
})();
