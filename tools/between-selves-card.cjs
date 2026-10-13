/* between-selves 的封面换成展览海报本身。
 *
 * 原来是 c-henna-hand 那类手部彩绘特写 —— 读起来是个人艺术。
 * 但这个项目在橱窗里的作用是「营销证据」：线下号召力 + IG / 小红书宣传。
 * a-poster.jpg 是排好字的展览海报立在展厅里，同时是设计成品和宣传物料，
 * 这才对得上它该讲的那件事。
 *
 * 源 2200x1467（1.50），卡片是 4:3，所以左右各裁约 11%，
 * 海报主体在画面中段，不会被切到。
 */
const sharp = require('sharp');
const fs = require('fs');

const SRC = 'src/content/projects/between-selves/a-poster.jpg';
const OUT = 'src/content/projects/between-selves/card.jpg';
const SP = '/private/tmp/claude-501/-Users-macbookpro-projects-portfolio/ab00b39d-2308-4589-8330-0c09d2a70234/scratchpad';

(async () => {
  const m = await sharp(SRC).metadata();
  const w = Math.round(m.height * 4 / 3);
  const left = Math.round((m.width - w) / 2);
  console.log(`源 ${m.width}x${m.height} (${(m.width / m.height).toFixed(3)})  ` +
    `裁 ${w}x${m.height} @ ${left},0  左右各去 ${left}px`);

  await sharp(SRC).extract({ left, top: 0, width: w, height: m.height })
    .resize(1800, 1350, { fit: 'cover' })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(OUT);

  const mo = await sharp(OUT).metadata();
  console.log(`${OUT}  ${mo.width}x${mo.height} (${(mo.width / mo.height).toFixed(3)})  ` +
    `${(fs.statSync(OUT).size / 1024).toFixed(0)}KB`);
  console.log(`  卡片最大档 1200 要 1200 物理像素，有 ${mo.width}  ${mo.width >= 1200 ? '够' : '不够'}`);
  await sharp(OUT).resize(520).jpeg({ quality: 90 }).toFile(`${SP}/v-card-bs.jpg`);
})();
