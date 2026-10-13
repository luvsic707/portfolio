/* 判定 a-lockups.png 到底有没有被切 —— 用一个确定完整的样本做基准。
 *
 * Asset 8@1.5x.png 四边各有 54px 留白（量过，边缘带墨 0/0/0/0），
 * 所以它是确定完整的；而它正是组合图的第三行。
 * 两者都去掉透明边、按高度归一，如果组合图那行真被切，
 * 它会明显比 Asset 8 窄 —— 比例对不上。
 *
 * 为什么不能只看「边缘带墨比例」：那个指标会给假阳性。
 * 几何构形的笔画末端本来就是平的，紧裁之后自然贴边，
 * 读数很高但一笔没少 —— a-logotype 就是这样，我已经照着它判错一次。
 */
const sharp = require('sharp');

const SP = '/private/tmp/claude-501/-Users-macbookpro-projects-portfolio/ab00b39d-2308-4589-8330-0c09d2a70234/scratchpad';
const A8 = '/Users/macbookpro/Desktop/作品集图片/10 NUO2/排版第一次/1.5x/Asset 8@1.5x.png';
const LK = 'src/content/projects/nuo2/a-lockups.png';
const ROW3 = { left: 0, top: 1109, width: 1900, height: 513 };

(async () => {
  const trim = async (buf) => sharp(buf).trim({ threshold: 1 }).png().toBuffer();
  const a = await trim(await sharp(A8).png().toBuffer());
  const b = await trim(await sharp(LK).extract(ROW3).png().toBuffer());
  const ma = await sharp(a).metadata(), mb = await sharp(b).metadata();
  const ra = ma.width / ma.height, rb = mb.width / mb.height;

  console.log(`Asset 8（确定完整）  ${ma.width}x${ma.height}  比例 ${ra.toFixed(3)}`);
  console.log(`组合图第三行        ${mb.width}x${mb.height}  比例 ${rb.toFixed(3)}`);
  console.log(`比例差 ${Math.abs(ra - rb).toFixed(3)}  ` +
    `${Math.abs(ra - rb) > 0.15 ? '→ 对不上，第三行被切了' : '→ 对得上，第三行没被切'}`);

  const Hn = 300;
  const an = await sharp(a).resize({ height: Hn }).flatten({ background: '#2BAE9E' }).png().toBuffer();
  const bn = await sharp(b).resize({ height: Hn }).flatten({ background: '#2BAE9E' }).png().toBuffer();
  const mA = await sharp(an).metadata(), mB = await sharp(bn).metadata();
  await sharp({
    create: { width: Math.max(mA.width, mB.width) + 20, height: Hn * 2 + 30, channels: 3, background: '#ffffff' },
  }).composite([{ input: an, left: 10, top: 10 }, { input: bn, left: 10, top: Hn + 20 }])
    .jpeg({ quality: 94 }).toFile(`${SP}/v-row3.jpg`);
  console.log(`\nv-row3.jpg  上 = Asset 8 (${mA.width}px)  下 = 组合图第三行 (${mB.width}px)`);
})();
