/* 新旧字标叠起来比形状。
 *
 * 为什么必须比：新图比例 0.955，和原来那张一模一样。
 * 如果原图真被切掉一圈，比例该变。而几何字标的笔画末端本来就是平的,
 * 平笔画贴着紧裁框也会让「边缘带墨」读数很高 ——
 * 也就是说那个指标可能给了我假阳性，原图其实没被切。
 * 这个必须用眼睛和差值图确认，不能只看数字。
 *
 *   node tools/nuo2-logotype-compare.cjs <旧图> <新图>
 */
const sharp = require('sharp');
const SP = '/private/tmp/claude-501/-Users-macbookpro-projects-portfolio/ab00b39d-2308-4589-8330-0c09d2a70234/scratchpad';

const [oldP, newP] = process.argv.slice(2);
const N = 700;   // 都归一到这个宽度再比

(async () => {
  const mask = async (p) => {
    const { data, info } = await sharp(p).ensureAlpha()
      .resize(N, N, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .raw().toBuffer({ resolveWithObject: true });
    const a = Buffer.alloc(info.width * info.height);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) a[j] = data[i + 3] > 110 ? 255 : 0;
    return { a, W: info.width, H: info.height };
  };
  const o = await mask(oldP), n = await mask(newP);

  /* 差值图：旧有新无 = 红（新图丢了东西）
              新有旧无 = 绿（旧图当年被切掉的）
              两者都有 = 灰 */
  const rgb = Buffer.alloc(o.W * o.H * 3);
  let onlyOld = 0, onlyNew = 0, both = 0;
  for (let i = 0; i < o.a.length; i++) {
    const O = o.a[i] > 0, M = n.a[i] > 0;
    const p = i * 3;
    if (O && M) { rgb[p] = 150; rgb[p + 1] = 150; rgb[p + 2] = 150; both++; }
    else if (O) { rgb[p] = 224; rgb[p + 1] = 36; rgb[p + 2] = 94; onlyOld++; }
    else if (M) { rgb[p] = 40; rgb[p + 1] = 180; rgb[p + 2] = 120; onlyNew++; }
    else { rgb[p] = 255; rgb[p + 1] = 255; rgb[p + 2] = 255; }
  }
  await sharp(rgb, { raw: { width: o.W, height: o.H, channels: 3 } })
    .jpeg({ quality: 94 }).toFile(`${SP}/v-diff.jpg`);

  const tot = both + onlyOld + onlyNew;
  console.log(`重合 ${(both / tot * 100).toFixed(1)}%  ` +
    `只在旧图 ${(onlyOld / tot * 100).toFixed(1)}%（红）  ` +
    `只在新图 ${(onlyNew / tot * 100).toFixed(1)}%（绿）`);
  console.log('v-diff.jpg —— 重合率高就说明旧图本来没被切，那个指标是假阳性');
})();
