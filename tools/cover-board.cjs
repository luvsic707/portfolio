/* 把所有项目的封面拼成一张板，配 slug / 分类 / 一句简介。
 * 用来做橱窗选片 —— 只有两个真正的品牌项目，剩下的格子得看图决定。
 */
const sharp = require('sharp');
const fs = require('fs');

const SP = '/private/tmp/claude-501/-Users-macbookpro-projects-portfolio/ab00b39d-2308-4589-8330-0c09d2a70234/scratchpad';
const DIR = 'src/content/projects';

(async () => {
  const slugs = fs.readdirSync(DIR)
    .filter((d) => d !== '_template' && fs.existsSync(`${DIR}/${d}/index.md`))
    .sort();

  const CW = 300, CH = 260, COLS = 5;
  const tiles = [];
  let n = 0;
  for (const slug of slugs) {
    const md = fs.readFileSync(`${DIR}/${slug}/index.md`, 'utf8');
    const g = (k) => (md.match(new RegExp(`^${k}:\\s*(.+)$`, 'm')) || [])[1]?.trim() || '';
    const file = (md.match(/^cover:\s*\.\/(.+)$/m) || [])[1]?.trim();
    const sum = g('summary').replace(/\s+/g, ' ').slice(0, 96);
    console.log(`${String(n).padStart(2)}  ${slug.padEnd(22)} ${g('categories').padEnd(42)} ${g('year')}`);
    console.log(`    ${sum}`);
    const p = file && `${DIR}/${slug}/${file}`;
    const img = p && fs.existsSync(p)
      ? await sharp(p).resize(CW - 8, CH - 8, { fit: 'cover' }).png().toBuffer()
      : await sharp({ create: { width: CW - 8, height: CH - 8, channels: 3, background: '#dddddd' } }).png().toBuffer();
    tiles.push({ input: img, left: (n % COLS) * CW + 4, top: Math.floor(n / COLS) * CH + 4 });
    n++;
  }
  await sharp({ create: { width: CW * COLS, height: CH * Math.ceil(n / COLS), channels: 3, background: '#ffffff' } })
    .composite(tiles).jpeg({ quality: 86 }).toFile(`${SP}/v-covers.jpg`);
  console.log(`\n${n} 张 → v-covers.jpg（${COLS} 列，按上面的编号从 0 起）`);
})();
