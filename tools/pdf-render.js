/* 把 PDF / AI 的每一页渲成 PNG。
 *
 * 为什么是 JXA：这台机器没装 poppler，python3 里也没有 Quartz，
 * 而 macOS 自带的 PDFKit 能直接按任意倍数光栅化 —— 矢量页面渲多大都是清楚的。
 *
 * 为什么存成文件而不是每次内联：带变量和循环的复合 shell 命令
 * 一律会触发权限询问（Contains simple_expansion），而
 * `osascript -l JavaScript tools/pdf-render.js <参数>` 是一条干净命令，
 * 能直接匹配白名单。她睡觉的时候我需要这个。
 *
 *   osascript -l JavaScript tools/pdf-render.js <src> <outDir> <scale> [box] [maxPages]
 *
 * box: crop | media | art | bleed（默认 media —— 画板外的东西也要）
 */

ObjC.import('Foundation');
ObjC.import('Quartz');
ObjC.import('AppKit');

function run(argv) {
  const src = argv[0];
  const outDir = argv[1];
  const scale = parseFloat(argv[2] || '2');
  const boxName = argv[3] || 'media';
  const maxPages = parseInt(argv[4] || '999', 10);

  const BOX = {
    crop: $.kPDFDisplayBoxCropBox,
    media: $.kPDFDisplayBoxMediaBox,
    art: $.kPDFDisplayBoxArtBox,
    bleed: $.kPDFDisplayBoxBleedBox,
  }[boxName];

  $.NSFileManager.defaultManager
    .createDirectoryAtPathWithIntermediateDirectoriesAttributesError(
      $(outDir), true, $(), $());

  const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath($(src)));
  if (!doc.js) return 'FAIL could not open ' + src;

  const total = Math.min(doc.pageCount, maxPages);
  const out = [];
  for (let i = 0; i < total; i++) {
    const page = doc.pageAtIndex(i);
    const b = page.boundsForBox(BOX);
    let w = Math.round(b.size.width * scale);
    let h = Math.round(b.size.height * scale);
    /* 14400pt 的画板乘上倍数会爆内存，收到一个安全的长边 */
    const cap = 9000;
    if (w > cap || h > cap) {
      const k = cap / Math.max(w, h);
      w = Math.round(w * k);
      h = Math.round(h * k);
    }
    if (w < 2 || h < 2) { out.push('p' + (i + 1) + ' skip'); continue; }
    const img = page.thumbnailOfSizeForBox($.NSMakeSize(w, h), BOX);
    const rep = $.NSBitmapImageRep.imageRepWithData(img.TIFFRepresentation);
    const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
    const name = 'p' + String(i + 1).padStart(2, '0') + '.png';
    png.writeToFileAtomically($(outDir + '/' + name), true);
    out.push(name + ' ' + w + 'x' + h);
  }
  return out.join('\n');
}
