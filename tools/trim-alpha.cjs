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

/* 白底模式：给「压平过的抠图」用。
 *
 * 作品集里同一排四张图，可能只有一张是真 alpha，其余三张是白底的 jpg 或
 * 不透明 webp —— 它们靠 cutout 的 multiply 显示，肉眼看是抠好的，但文件层面
 * 白边一寸没少。只裁 alpha 的话，一排里就只有一张缩到了自己的边缘，
 * 另外三张还揣着白边，于是看着一大三小。实测 type-no-2-04 的内容只占画布
 * 42% 宽 —— 这就是它看起来小的全部原因。
 *
 * 阈值裁白是危险的：Otaku 有一次就是这么把笔画末端切掉的。所以这里**不信任
 * 单个阈值**，而是在两个阈值下各算一次包围盒，只有两次结果几乎重合（相差
 * 不到长边的 1.5%）才承认那圈白是空的。边缘外真有淡墨的话，松阈值会把框
 * 撑开，两次对不上，函数直接拒绝裁。
 */
const TH_TIGHT = 243, TH_LOOSE = 253;

async function visibleBox(sharp, src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: c } = info;

  const boxAt = (th) => {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * c;
        if (data[i + 3] <= 12) continue;
        const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        if (lum >= th) continue;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  };

  const tight = boxAt(TH_TIGHT), loose = boxAt(TH_LOOSE);
  if (!tight || !loose) return null;

  const slack = Math.max(W, H) * 0.015;
  const drift = Math.max(
    Math.abs(tight.x0 - loose.x0), Math.abs(tight.y0 - loose.y0),
    Math.abs(tight.x1 - loose.x1), Math.abs(tight.y1 - loose.y1),
  );
  if (drift > slack) return null;   // 边上还有东西，不确定，就不动它

  const pad = MARGIN;
  const left = Math.max(0, loose.x0 - pad), top = Math.max(0, loose.y0 - pad);
  const right = Math.min(W, loose.x1 + 1 + pad), bottom = Math.min(H, loose.y1 + 1 + pad);
  const width = right - left, height = bottom - top;
  if (width >= W && height >= H) return null;
  if (width < 8 || height < 8) return null;
  return { left, top, width, height };
}

module.exports = { alphaBox, visibleBox };

/* 一次性补裁：node tools/trim-alpha.cjs [--white] <文件…>
 *
 * 默认只裁真 alpha —— 那个判断没有阈值，放在导入流程里跑也安全。
 * --white 会连白底一起裁，那是有阈值的判断，所以不自动跑：白底该不该当空，
 * 取决于这一节是不是走 cutout，而那是一节一节手判的。 */
if (require.main === module) {
  const sharp = require('sharp');
  const { renameSync } = require('fs');
  const args = process.argv.slice(2);
  const white = args.includes('--white');
  (async () => {
    let done = 0;
    for (const f of args.filter((a) => a !== '--white')) {
      const box = (await alphaBox(sharp, f)) ?? (white ? await visibleBox(sharp, f) : null);
      if (!box) { console.log(`  ·  ${f.split('/').pop()} 已经贴边`); continue; }
      const meta = await sharp(f).metadata();
      /* 按扩展名选编码器 —— 一排里 jpg 和 webp 是混着的，
         统一写 webp 会把 webp 的字节塞进 .jpg 的文件名。 */
      const pipe = sharp(f).extract(box);
      const out = /\.jpe?g$/i.test(f)
        ? pipe.jpeg({ quality: 88, mozjpeg: true })
        : pipe.webp({ quality: 82, effort: 5 });
      await out.toFile(f + '.tmp');
      renameSync(f + '.tmp', f);
      console.log(`  ✂  ${f.split('/').pop().padEnd(46)} ${meta.width}×${meta.height} → ${box.width}×${box.height}`);
      done++;
    }
    console.log(`\n裁了 ${done} 张。`);
  })().catch((e) => { console.error(e); process.exit(1); });
}
