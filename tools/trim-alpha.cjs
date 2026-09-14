/* 把抠图裁到它自己的边缘。
 *
 * 为什么要有这个：作品集里大量的图是抠出来的，画布比画本身大一圈，
 * 而且每张大的程度都不一样（实测 28%–99% 都有）。所有的版式系统 ——
 * .band 让一行等高、.plot 按栏定位、.grid-N 顶边对齐 —— 摆的都是
 * **画布**。画布里空多少，画就小多少、偏多少。2026-09-14 那晚三个
 * 「排得不对」的问题（bpd 的书页散开、moodboard 不齐、contours 的模型偏小）
 * 根因全是这个，而不是版式参数。
 *
 * 只切 alpha 严格为 0 的像素。不用阈值 —— Otaku 那次用阈值把笔画末端
 * 切掉了，抗锯齿边缘的 alpha 可以低到 1。
 *
 * 找包围盒在缩略图上做（长边 512），再按比例放大回去，误差用余量吃掉：
 * 余量 = 缩放倍数 + 6px，所以映射回全分辨率时不可能切进内容里。
 * 直接读 5184px 的原图会吃掉几百 MB 内存，一节几十张就崩了。
 */
const PROBE = 512;
const MARGIN = 6;

/** 返回 {left, top, width, height}；整张全透明或已经贴边则返回 null */
async function alphaBox(sharp, src) {
  const meta = await sharp(src).metadata();
  const W = meta.width, H = meta.height;
  if (!W || !H) return null;

  const scale = Math.max(1, Math.max(W, H) / PROBE);
  const pw = Math.max(1, Math.round(W / scale));
  const ph = Math.max(1, Math.round(H / scale));

  const { data } = await sharp(src)
    .ensureAlpha()
    .resize(pw, ph, { fit: 'fill' })
    .extractChannel('alpha')
    .raw()
    .toBuffer({ resolveWithObject: true });

  let x0 = pw, y0 = ph, x1 = -1, y1 = -1;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      if (data[y * pw + x] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;                    // 全透明，不动它

  const pad = Math.ceil(scale) + MARGIN;
  const left = Math.max(0, Math.floor(x0 * scale) - pad);
  const top = Math.max(0, Math.floor(y0 * scale) - pad);
  const right = Math.min(W, Math.ceil((x1 + 1) * scale) + pad);
  const bottom = Math.min(H, Math.ceil((y1 + 1) * scale) + pad);

  const width = right - left, height = bottom - top;
  if (width >= W && height >= H) return null; // 已经贴边，省一次重编码
  if (width < 8 || height < 8) return null;   // 结果小得不像话，宁可不动
  return { left, top, width, height };
}

module.exports = { alphaBox };

/* 直接跑就是一次性补裁：node tools/trim-alpha.cjs <文件…> */
if (require.main === module) {
  const sharp = require('sharp');
  const { renameSync } = require('fs');
  (async () => {
    let done = 0;
    for (const f of process.argv.slice(2)) {
      const box = await alphaBox(sharp, f);
      if (!box) { console.log(`  ·  ${f.split('/').pop()} 已经贴边`); continue; }
      const meta = await sharp(f).metadata();
      await sharp(f).extract(box).webp({ quality: 82, effort: 5 }).toFile(f + '.tmp');
      renameSync(f + '.tmp', f);
      console.log(`  ✂  ${f.split('/').pop().padEnd(46)} ${meta.width}×${meta.height} → ${box.width}×${box.height}`);
      done++;
    }
    console.log(`\n裁了 ${done} 张。`);
  })().catch((e) => { console.error(e); process.exit(1); });
}
