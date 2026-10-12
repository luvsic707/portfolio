#!/usr/bin/env node
/* 按清单批量下载图片，存成 01.jpg 02.jpg… 方便接 contact-sheet。
 *
 * 存成文件的理由同 contact-sheet.cjs：复合 shell 命令会触发权限询问，
 * 一条 `node tools/fetch-list.cjs ...` 不会。
 *
 *   node tools/fetch-list.cjs <清单txt，一行一个url> <输出目录> [referer]
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const [, , listFile, outDir, referer] = process.argv;
if (!listFile || !outDir) {
  console.error('用法: node tools/fetch-list.cjs <清单.txt> <输出目录> [referer]');
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const urls = fs.readFileSync(listFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

function get(url, dest, redirects = 0) {
  return new Promise((resolve) => {
    if (redirects > 4) return resolve('too many redirects');
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        ...(referer ? { Referer: referer } : {}),
      },
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return get(res.headers.location, dest, redirects + 1).then(resolve);
      }
      if (res.statusCode !== 200) { res.resume(); return resolve('HTTP ' + res.statusCode); }
      const f = fs.createWriteStream(dest);
      res.pipe(f);
      f.on('finish', () => { f.close(); resolve('ok ' + (fs.statSync(dest).size / 1024).toFixed(0) + 'KB'); });
    });
    req.on('error', (e) => resolve('ERR ' + e.message));
    req.setTimeout(30000, () => { req.destroy(); resolve('timeout'); });
  });
}

(async () => {
  let i = 0;
  for (const u of urls) {
    i++;
    const ext = (u.match(/\.(jpe?g|png|gif|webp)(\?|$)/i) || [, 'jpg'])[1];
    const dest = path.join(outDir, String(i).padStart(2, '0') + '.' + ext);
    const r = await get(u, dest);
    console.log(String(i).padStart(2, '0'), r);
  }
})();
