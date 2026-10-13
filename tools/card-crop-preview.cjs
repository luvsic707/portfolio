/* 预览每张封面在 4:3 卡片里会被 object-fit:cover 裁掉什么。
 *
 * 卡片是 aspect-ratio 4/3，所以不是 1.333 的封面都会被居中裁：
 * 比 4:3 更方的（如 1:1）上下各切，更宽的左右各切。
 * 裁掉的部分画成半透明红，一眼能看出有没有切掉要紧的东西。
 *
 *   node tools/card-crop-preview.cjs <slug> [<slug>...]
 */
const sharp = require('sharp');
const fs = require('fs');

const SP = '/private/tmp/claude-501/-Users-macbookpro-projects-portfolio/ab00b39d-2308-4589-8330-0c09d2a70234/scratchpad';
const DIR = 'src/content/projects';
const RATIO = 4 / 3;

(async () => {
  const slugs = process.argv.slice(2);
  const tiles = [];
  const TW = 440, TH = 340;
  for (const [i, slug] of slugs.entries()) {
    const md = fs.readFileSync(`${DIR}/${slug}/index.md`, 'utf8');
    const file = (md.match(/^cover:\s*\.\/(.+)$/m) || [])[1]?.trim();
    const p = `${DIR}/${slug}/${file}`;
    const m = await sharp(p).metadata();
    const r = m.width / m.height;

    /* cover 的裁法：比 4:3 更方 → 切上下；更宽 → 切左右 */
    let cw = m.width, ch = m.height;
    if (r > RATIO) cw = Math.round(m.height * RATIO);
    else ch = Math.round(m.width / RATIO);
    const cl = Math.round((m.width - cw) / 2), ct = Math.round((m.height - ch) / 2);
    const lossPct = (1 - (cw * ch) / (m.width * m.height)) * 100;
    console.log(`${slug.padEnd(16)} ${m.width}x${m.height} 比例 ${r.toFixed(3)}  ` +
      `卡片取 ${cw}x${ch} @ ${cl},${ct}  丢掉 ${lossPct.toFixed(0)}%` +
      `${r > RATIO ? '（左右）' : ch < m.height ? '（上下）' : '（不裁）'}`);

    /* 整张缩图 + 被裁区域盖半透明红 */
    const base = await sharp(p).resize(TW - 8, TH - 8, { fit: 'contain', background: '#ffffff' })
      .png().toBuffer();
    const mb = await sharp(base).metadata();
    /* 把裁框换算到缩图坐标 */
    const sx = mb.width / m.width, sy = mb.height / m.height;
    const rx = Math.round(cl * sx), ry = Math.round(ct * sy);
    const rw = Math.round(cw * sx), rh = Math.round(ch * sy);
    const mask = Buffer.from(
      `<svg width="${mb.width}" height="${mb.height}">` +
      `<rect width="100%" height="100%" fill="#E0245E" opacity="0.45"/>` +
      `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="#000"/>` +
      `</svg>`);
    const shown = await sharp(base)
      .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    const red = await sharp({ create: { width: mb.width, height: mb.height, channels: 3, background: '#E0245E' } })
      .composite([{ input: base, blend: 'over' }, { input: shown, blend: 'over' }]).png().toBuffer();
    tiles.push({ input: red, left: (i % 2) * TW + 4, top: Math.floor(i / 2) * TH + 4 });
  }
  await sharp({ create: { width: TW * 2, height: TH * Math.ceil(slugs.length / 2), channels: 3, background: '#ffffff' } })
    .composite(tiles).jpeg({ quality: 90 }).toFile(`${SP}/v-cardcrop.jpg`);
  console.log('\nv-cardcrop.jpg —— 红色盖住的就是卡片上看不到的部分');
})();
