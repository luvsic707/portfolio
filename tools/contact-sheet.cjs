#!/usr/bin/env node
/* 把一个文件夹（或一串文件）拼成一张总览图，用来快速看一批素材。
 *
 * 存成文件而不是每次内联写脚本：带变量和 heredoc 的复合 shell 命令
 * 一律触发权限询问，而 `node tools/contact-sheet.cjs <参数>` 是一条
 * 干净命令，能匹配白名单。
 *
 *   node tools/contact-sheet.cjs <输入目录或glob> <输出jpg> [每行列数] [单格宽] [底色]
 *
 * 例：
 *   node tools/contact-sheet.cjs /tmp/zvi /tmp/sheet.jpg 5 300
 *   node tools/contact-sheet.cjs "src/content/projects/nuo2/c-*.jpg" /tmp/c.jpg 4 260 '#2F3F47'
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const [, , input, out, colsArg, cellArg, bgArg] = process.argv;
if (!input || !out) {
  console.error('用法: node tools/contact-sheet.cjs <目录或glob> <输出.jpg> [列数] [格宽] [底色]');
  process.exit(1);
}
const cols = parseInt(colsArg || '5', 10);
const cell = parseInt(cellArg || '300', 10);
const bg = bgArg || '#efefef';

function collect(spec) {
  if (fs.existsSync(spec) && fs.statSync(spec).isDirectory()) {
    return fs.readdirSync(spec)
      .filter((f) => /\.(png|jpe?g|webp|gif|tiff?)$/i.test(f))
      .sort()
      .map((f) => path.join(spec, f));
  }
  /* 极简 glob：只支持目录 + 一个 * 的文件名 */
  const dir = path.dirname(spec);
  const pat = path.basename(spec).split('*');
  return fs.readdirSync(dir)
    .filter((f) => f.startsWith(pat[0]) && f.endsWith(pat[pat.length - 1] || ''))
    .sort()
    .map((f) => path.join(dir, f));
}

(async () => {
  const files = collect(input);
  if (!files.length) { console.error('没找到图片'); process.exit(1); }

  const pad = 6;
  const tiles = [];
  const rows = Math.ceil(files.length / cols);
  let rowH = 0;
  const meta = [];

  /* 先量一轮，取最高的那张定行高，这样格子对得齐 */
  for (const f of files) {
    try {
      const m = await sharp(f).metadata();
      const h = Math.round((cell - pad * 2) * m.height / m.width);
      meta.push({ f, w: m.width, h: m.height, sh: h });
      rowH = Math.max(rowH, h);
    } catch (e) { meta.push(null); }
  }
  rowH = Math.min(rowH, cell * 2) + pad * 2;

  for (let i = 0; i < meta.length; i++) {
    const m = meta[i];
    if (!m) continue;
    const buf = await sharp(m.f)
      .flatten({ background: bg })
      .resize(cell - pad * 2, rowH - pad * 2, { fit: 'contain', background: bg })
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#bbbbbb' })
      .png().toBuffer();
    tiles.push({ input: buf, left: (i % cols) * cell, top: Math.floor(i / cols) * rowH });
  }

  await sharp({ create: { width: cell * cols, height: rowH * rows, channels: 3, background: bg } })
    .composite(tiles).jpeg({ quality: 80 }).toFile(out);

  console.log(`${files.length} 张 → ${out}  (${cell * cols}x${rowH * rows}, ${cols} 列)`);
  meta.forEach((m, i) => { if (m) console.log(`  ${i + 1}. ${path.basename(m.f)} ${m.w}x${m.h}`); });
})();
