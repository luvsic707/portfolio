/* 逐秒（可更密）判定一段视频每个时刻是「横素材烤在竖画布里」还是「真竖幅」。
 *
 * a-walkthrough.mp4 是混剪：多数片段是 1080x720 的横画面上下各垫 360 黑边，
 * 有一段是 1080x1440 铺满。拿它当开屏时，一个固定裁框救不了混向的片子 ——
 * 按 3:2 裁会把那段竖幅的上下切掉。所以先量清楚各占多少。
 *
 *   node tools/video-timeline.cjs <视频> [步长秒]
 */
const sharp = require('sharp');
const { execFileSync } = require('child_process');
const fs = require('fs');

const SP = '/private/tmp/claude-501/-Users-macbookpro-projects-portfolio/ab00b39d-2308-4589-8330-0c09d2a70234/scratchpad';
const BLACK = 18, ROW_FRAC = 0.995;

const src = process.argv[2];
const step = parseFloat(process.argv[3] || '0.5');

const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries',
  'format=duration', '-of', 'default=nw=1:nk=1', src]).toString().trim());

(async () => {
  const tmp = `${SP}/_tl.png`;
  const rows = [];
  for (let t = 0; t < dur; t += step) {
    execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', src,
      '-frames:v', '1', '-y', tmp]);
    const { data, info } = await sharp(tmp).greyscale().raw()
      .toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = info;
    const rowBlack = (y) => {
      let n = 0;
      for (let x = 0; x < W; x++) if (data[y * W + x] <= BLACK) n++;
      return n / W >= ROW_FRAC;
    };
    let top = 0; while (top < H && rowBlack(top)) top++;
    let bot = 0; while (bot < H && rowBlack(H - 1 - bot)) bot++;
    rows.push({ t: +t.toFixed(1), top, bot, h: H - top - bot });
  }
  fs.existsSync(tmp) && fs.unlinkSync(tmp);

  const letterboxed = rows.filter((r) => r.top > 100);
  const fullframe = rows.filter((r) => r.top <= 100);
  console.log(`时长 ${dur.toFixed(1)}s，每 ${step}s 取一帧，共 ${rows.length} 帧`);
  console.log(`  横素材烤在竖画布里 ${letterboxed.length} 帧 (${(letterboxed.length / rows.length * 100).toFixed(0)}%)`);
  console.log(`  真竖幅铺满       ${fullframe.length} 帧 (${(fullframe.length / rows.length * 100).toFixed(0)}%)`);
  console.log('\n时间线（L = 横素材垫黑边，V = 真竖幅）:');
  console.log('  ' + rows.map((r) => (r.top > 100 ? 'L' : 'V')).join(''));
  console.log('  ' + rows.map((r, i) => (i % 4 === 0 ? String(r.t).padEnd(4).slice(0, 4) : '')).join(''));

  /* 真竖幅那几段的起止 */
  const segs = [];
  let cur = null;
  for (const r of rows) {
    const isV = r.top <= 100;
    if (isV && !cur) cur = { a: r.t, b: r.t };
    else if (isV) cur.b = r.t;
    else if (cur) { segs.push(cur); cur = null; }
  }
  if (cur) segs.push(cur);
  if (segs.length) {
    console.log('\n真竖幅段:');
    for (const s of segs) console.log(`  ${s.a}s – ${(s.b + step).toFixed(1)}s`);
  }
  const bars = letterboxed[0];
  if (bars) console.log(`\n横素材的黑边: 上 ${bars.top} 下 ${bars.bot}，真画面 高 ${bars.h}`);
})();
