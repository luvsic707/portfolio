/* 量一段视频里烤死的黑边在哪。
 *
 * a-walkthrough.mp4 声明是 1080x1440（竖），但画面是横的带上下黑边 ——
 * 也就是竖画布里塞了一段横素材，黑边是烤进文件里的，不是播放器加的。
 * 拿它当开屏得先把黑边切掉，否则整屏开场里会横着两条黑带。
 *
 * 抽多帧取并集：某一帧的画面本身可能就是暗的，单帧会把真画面误判成黑边。
 *
 *   node tools/video-bars.cjs <帧图...>
 */
const sharp = require('sharp');

const BLACK = 18;      // 这以下算黑
const ROW_FRAC = 0.995; // 一行里有这么多比例的像素是黑，才算黑边

(async () => {
  const files = process.argv.slice(2);
  let top = Infinity, bot = Infinity, W = 0, H = 0;
  for (const f of files) {
    const { data, info } = await sharp(f).greyscale().raw()
      .toBuffer({ resolveWithObject: true });
    W = info.width; H = info.height;
    const rowBlack = (y) => {
      let n = 0;
      for (let x = 0; x < W; x++) if (data[y * W + x] <= BLACK) n++;
      return n / W >= ROW_FRAC;
    };
    let t = 0; while (t < H && rowBlack(t)) t++;
    let b = 0; while (b < H && rowBlack(H - 1 - b)) b++;
    console.log(`${f.split('/').pop()}  上黑 ${t}  下黑 ${b}`);
    /* 并集 = 取最小值：任何一帧说这里有画面，这里就有画面 */
    top = Math.min(top, t); bot = Math.min(bot, b);
  }
  const ch = H - top - bot;
  console.log(`\n所有帧的并集：上黑 ${top}  下黑 ${bot}`);
  console.log(`真画面 ${W}x${ch}  比例 ${(W / ch).toFixed(3)}  ` +
    `（文件声明 ${W}x${H} = ${(W / H).toFixed(3)}）`);
  /* 切到偶数高，H.264 要求 */
  const even = ch - (ch % 2);
  console.log(`给 ffmpeg: crop=${W}:${even}:0:${top}   （H.264 要偶数边长）`);
})();
