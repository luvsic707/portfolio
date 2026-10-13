/* 把 PDF/AI 的页面框原地改大，让画板外的画面也能被光栅化。
 *
 * 为什么需要：Illustrator 存 .ai 时带一份 PDF 兼容流，但画面常常放在
 * 画板外面，而 PDFKit（thumbnailOfSizeForBox / drawWithBox）一律裁在
 * 声明的框里 —— art / bleed / crop / media 四个框在这些文件里是同一个
 * A4，所以换框没用，必须把框本身改大。
 *
 * 为什么是等长替换：这些文件的 xref 表记录的是每个对象的字节偏移。
 * 替换串只要和原串一样长，所有偏移就都还有效，不用重建 xref。
 *   原  /MediaBox[0.0 0.0 595.276 841.89]      33 字节
 *   新  /MediaBox[-500 -500 2000 2000   ]      33 字节（空格补齐，PDF 允许）
 *
 * 只改副本。原文件一个字节都不动。
 *
 *   node tools/pdf-widen-box.js <src> <out> [x0 y0 x1 y1]
 */
const fs = require('fs');

const [src, out, ...nums] = process.argv.slice(2);
if (!src || !out) {
  console.error('用法: node tools/pdf-widen-box.js <src> <out> [x0 y0 x1 y1]');
  process.exit(1);
}
const box = nums.length === 4 ? nums.map(Number) : [-500, -500, 2000, 2000];

const buf = fs.readFileSync(src);
let patched = 0;

/* 逐个框名找、逐处等长替换。
   ArtBox / BleedBox / CropBox 也一起改 —— 留着旧的小框，
   有些渲染器会优先用它，白改一场。 */
for (const name of ['MediaBox', 'ArtBox', 'BleedBox', 'CropBox', 'TrimBox']) {
  const tag = Buffer.from(`/${name}[`);
  let at = 0;
  for (;;) {
    const i = buf.indexOf(tag, at);
    if (i < 0) break;
    const close = buf.indexOf(0x5d /* ] */, i);
    if (close < 0) break;
    const innerLen = close - (i + tag.length);
    const want = box.join(' ');
    if (want.length <= innerLen) {
      /* 空格补到原长，一个字节都不多不少 */
      const repl = Buffer.from(want + ' '.repeat(innerLen - want.length));
      repl.copy(buf, i + tag.length);
      patched++;
    } else {
      console.warn(`  跳过一处 /${name}：新框 ${want.length} 字节 > 原位 ${innerLen} 字节，` +
        `等长替换放不下`);
    }
    at = close + 1;
  }
}

fs.writeFileSync(out, buf);
console.log(`改了 ${patched} 处框 → [${box.join(' ')}]`);
console.log(`写出 ${out}  ${(buf.length / 1048576).toFixed(0)}MB`);
