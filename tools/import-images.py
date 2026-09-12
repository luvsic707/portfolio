#!/usr/bin/env python3
"""
把桌面「作品集图片」里的图，按章节导入到各个项目，并自动排版。

用法：
    python3 tools/import-images.py            # 全部项目
    python3 tools/import-images.py eden-of-east   # 只做某一个

版式由「章节名 + 数量」自动决定，见 layout_for()：

    成品章节（名字含 FINAL / OUTPUT / OUTCOME / STILL / PRINT / POSTER /
              IMPLEMENTATION / ON SKIN / HEALED / FRESH / RECENT / PLATE / PIECES）
        1 张      → full      通栏
        2–16 张   → showcase  满宽两栏大图（视觉权重最高）
        17 张以上 → flow      满宽三栏瀑布流

    过程章节
        1 张      → full
        2–4 张    → grid-2/3/4  一排排完，不占重量
        5–12 张   → flow        三栏瀑布流
        13 张以上 → strip       横向接触表，左右滑

    子小节（###）  密排小图 grid-2/3/4，超过 6 张走 strip

图和视频按文件名混在同一块里；下划线开头的文件夹跳过（弃用素材原地封存）。

可重复运行：每次都会重新生成，不会叠加。
手写的段落不会被动，脚本只管 <!-- auto:images --> 标记之间的部分。
"""

import math
import os, re, subprocess, sys, shutil
import hashlib
from pathlib import Path

HOME = Path.home()
STAGING = HOME / "Desktop" / "作品集图片"
ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "src" / "content" / "projects"
PUBLIC = ROOT / "public"

RASTER = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff", ".psd", ".gif"}
VIDEO = {".mp4", ".mov", ".m4v", ".avi"}

MARK_OPEN, MARK_CLOSE = "<!-- auto:images -->", "<!-- /auto:images -->"
MARK_SKIP = "<!-- auto:skip"

MAX_EDGE_GRID = 1200     # 网格小图（4 列里每格约 270px，1200 已很宽裕）
MAX_EDGE_FULL = 2400     # 通栏大图和封面
QUALITY = 72


def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^\w\s-]", " ", s, flags=re.UNICODE)
    s = re.sub(r"[\s_]+", "-", s.strip())
    return re.sub(r"-{2,}", "-", s).strip("-") or "img"


def convert(src: Path, dst: Path, max_edge: int) -> bool:
    """用 sips 转成 jpg 并缩到合适尺寸。HEIC / PSD 也能吃。"""
    dst.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(
        ["sips", "-Z", str(max_edge), "-s", "format", "jpeg",
         "-s", "formatOptions", str(QUALITY), str(src), "--out", str(dst)],
        capture_output=True,
    )
    return r.returncode == 0 and dst.exists()


def has_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def file_hash(path: Path) -> str:
    """源文件的内容指纹。同一个视频常常既放在 00封面 里当开屏，
    又放在某个章节里当正文 —— 不查重的话会压出两个字节相同的 mp4，
    挂在两个 URL 上，浏览器缓存对不上，访客把同一段下两遍。"""
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# 静态托管普遍有单文件上限：Cloudflare Pages 是 25 MiB。
# 超了不是变慢，是这个文件根本传不上去、线上直接 404。
# 留一点余量按 24 MiB 卡。
MAX_VIDEO_BYTES = 24 * 1024 * 1024


def compress_video(src: Path, dst: Path) -> bool:
    """压成网页规格的 mp4。

    关键几项：
      H.264 + yuv420p  —— 兼容性最好，各浏览器都认
      CRF 24           —— 画质/体积的甜点，网页尺寸下看不出损失
      宽度封顶 1920    —— 再大对网页没意义
      +faststart       —— 把索引移到文件头，不用下完就能起播（很重要）

    压完还超上限就逐档加 CRF 重来。长视频用 24 压出来经常三十几兆，
    直接上传会失败 —— 宁可这一段糊一点，也不能线上点开是 404。
    """
    if not has_ffmpeg():
        return False          # 没装 ffmpeg 就跳过视频，图片照常导入
    dst.parent.mkdir(parents=True, exist_ok=True)
    for crf in (24, 28):
        r = subprocess.run(
            ["ffmpeg", "-y", "-i", str(src),
             "-vf", "scale='min(1920,iw)':-2",
             "-c:v", "libx264", "-crf", str(crf), "-preset", "medium", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "128k",
             "-movflags", "+faststart",
             str(dst)],
            capture_output=True,
        )
        if r.returncode != 0 or not dst.exists():
            return False
        if dst.stat().st_size <= MAX_VIDEO_BYTES:
            if crf != 24:
                print(f"     ↓ {dst.name} 用 CRF {crf} 才压到上限内"
                      f"（{dst.stat().st_size / 1048576:.1f}MB）")
            return True

    # CRF 是「定质量不定体积」，长视频怎么调档都可能超上限
    # —— 四分半的 1080p 就是这样。这时候只能反过来：
    # 按时长算出能塞进上限的码率，定码率两遍编码去命中它。
    return fit_video(src, dst)


def probe_duration(path: Path) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(path)],
        capture_output=True, text=True,
    )
    try:
        return float(r.stdout.strip())
    except ValueError:
        return 0.0


def fit_video(src: Path, dst: Path) -> bool:
    """定码率两遍编码，把体积压到上限以内。

    两遍是必须的：一遍编码命中不了目标码率，误差能有百分之几十，
    正好卡在上限附近的时候就会翻车。
    码率低到一定程度还硬撑 1080p 只会满屏色块，所以同时降分辨率。
    """
    dur = probe_duration(src)
    if dur < 1:
        return dst.exists()

    a_kbps = 96
    # 留 6% 余量给容器和索引的开销
    total = (MAX_VIDEO_BYTES * 8 / dur) / 1000 * 0.94
    v_kbps = max(220, int(total - a_kbps))
    # 每像素分到的码率太少就先降分辨率，糊成色块比降分辨率难看得多
    width = 1920 if v_kbps >= 1800 else 1600 if v_kbps >= 1100 else 1280
    log = dst.with_suffix(".ffpass")

    base = ["ffmpeg", "-y", "-i", str(src),
            "-vf", f"scale='min({width},iw)':-2",
            "-c:v", "libx264", "-b:v", f"{v_kbps}k",
            "-maxrate", f"{int(v_kbps * 1.4)}k", "-bufsize", f"{v_kbps * 2}k",
            "-preset", "medium", "-pix_fmt", "yuv420p",
            "-passlogfile", str(log)]

    p1 = subprocess.run(base + ["-pass", "1", "-an", "-f", "mp4", "/dev/null"],
                        capture_output=True)
    if p1.returncode != 0:
        return False
    p2 = subprocess.run(base + ["-pass", "2",
                                "-c:a", "aac", "-b:a", f"{a_kbps}k",
                                "-movflags", "+faststart", str(dst)],
                        capture_output=True)
    for f in log.parent.glob(log.name + "*"):
        f.unlink(missing_ok=True)
    if p2.returncode != 0 or not dst.exists():
        return False
    print(f"     ↓ {dst.name} 时长 {dur:.0f}s，改用定码率 {v_kbps}k@{width}w"
          f"（{dst.stat().st_size / 1048576:.1f}MB）")
    return True


def video_block(rel_paths, alt_base: str) -> str:
    """正文里的视频：整幅，带控件，不自动播放（正文里突然动起来很烦）。"""
    vids = "\n\n".join(
        f'<video src="{p}" controls playsinline preload="metadata" '
        f'aria-label="{alt_base} — video {i+1:02d}"></video>'
        for i, p in enumerate(rel_paths)
    )
    return f'<div class="videos">\n\n{vids}\n\n</div>'


def images_in(folder: Path):
    """只取本层的图，不递归 —— 子文件夹是下一级小节，各管各的。"""
    out = []
    for f in sorted(folder.iterdir(), key=lambda p: p.name.lower()):
        if f.is_file() and not f.name.startswith("."):
            if f.suffix.lower() in RASTER:
                out.append(f)
    return out


def videos_in(folder: Path):
    return [f for f in folder.iterdir()
            if f.is_file() and f.suffix.lower() in VIDEO and not f.name.startswith(".")]


def media_in(folder: Path):
    """图和视频一起按文件名排序 —— 它们是同一批作品，不该分成两块。"""
    out = []
    for f in sorted(folder.iterdir(), key=lambda p: p.name.lower()):
        if not f.is_file() or f.name.startswith("."):
            continue
        if f.suffix.lower() in RASTER:
            out.append(("img", f))
        elif f.suffix.lower() in VIDEO:
            out.append(("vid", f))
    return out


def poster_from_video(src: Path, dst: Path) -> bool:
    """从视频里抽一帧当列表页缩略图。

    只有视频没有图的项目，卡片会一直空着 —— 抽帧比让作者再挑一张省事。
    取第 1 秒，避开开头常见的黑场。
    """
    if not has_ffmpeg():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(
        ["ffmpeg", "-y", "-ss", "1", "-i", str(src), "-frames:v", "1",
         "-vf", f"scale='min({MAX_EDGE_FULL},iw)':-2", "-q:v", "3", str(dst)],
        capture_output=True,
    )
    return r.returncode == 0 and dst.exists()


def video_size(path: Path):
    """读出视频宽高，写进标签里，瀑布流才不会等元数据加载完再跳一次。"""
    if not shutil.which("ffprobe"):
        return (16, 9)
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", str(path)],
        capture_output=True, text=True,
    )
    try:
        w, h = r.stdout.strip().split("x")[:2]
        return (int(w), int(h))
    except Exception:
        return (16, 9)


def media_ratio(path: Path) -> float:
    """宽高比。图用 sips，视频用 ffprobe，读不出来就当 1。"""
    if path.suffix.lower() in VIDEO:
        w, h = video_size(path)
        return w / h if h else 1.0
    r = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
                       capture_output=True, text=True)
    w = h = 0
    for line in r.stdout.splitlines():
        if "pixelWidth:" in line:  w = int(line.split(":")[1])
        if "pixelHeight:" in line: h = int(line.split(":")[1])
    return w / h if w and h else 1.0


# 超过这个比例就算「超宽」—— 流程图、时间轴这类，并排就看不清标签了。
# 门槛要卡在所有常规画幅之上：16:9 是 1.78、2:1 是 2.0、21:9 是 2.37，
# 游戏截图和视频帧全落在这一带。之前是 1.9，于是一组 1.97 的过程截图
# 被当成流程图，四张各自通栏铺满视口。真正的流程图窄条通常在 3:1 往上。
WIDE_RATIO = 2.6


# 这些章节放的是成品，不管几张都要大图 —— 只按数量排会把主作品压成缩略图
FINISHED = ("FINAL", "OUTPUT", "OUTCOME", "STILL", "PRINT", "POSTER",
            "IMPLEMENTATION",
            # 纹身这类「拍下来的成品」也算成品章节
            "ON SKIN", "HEALED", "FRESH", "RECENT", "PLATE", "PIECES")


def is_finished(title: str) -> bool:
    t = title.upper()
    return any(k in t for k in FINISHED)


def layout_for(n: int, title: str = "", is_sub: bool = False) -> str:
    """决定一组图用哪种版式。

    showcase  成品：突破正文宽度的大图，两列，直给
    strip     过程：一条横向滑动带，图小、高度错落、只占一屏的一小条
    full      单张通栏
    grid-N    数量少时的普通网格
    """
    # 成品优先判断 —— 成品永远大而直接，区别只在几件还是一批
    if is_finished(title):
        if n == 1:   return "full"       # 单件：通栏
        if n <= 16:  return "showcase"   # 一组成品：两栏大图，能多大就多大
        return "flow"                    # 几十件的合集：三栏瀑布流才收得住
    # 子小节是「细节」，密排小图，不跟大章节抢视觉重量
    if is_sub:
        if n == 1:  return "grid-2"
        if n <= 3:  return "grid-3"
        if n <= 6:  return "grid-4"
        return "strip"
    if n == 1:
        return "full"
    # 四张以内一排排完 —— 过程素材不是重点，别按成品的尺寸摊开
    if n <= 4:
        return f"grid-{n}"
    # 十几张以内竖着铺开 —— 过程图也得看得清，不该一上来就缩成小条
    if n <= 12:
        return "flow"
    # 真的多了才收进横向滑动带，纵向不再吃版面
    return "strip"


def pair_cols(r1: float, r2: float, max_spread: float = 2.2) -> tuple[float, float]:
    """两张并排时各占多少栏宽。

    高度相同的两张图，宽度之比就等于宽高比之比 —— 直接拿比例当栏宽，
    两张就一样高，也不用裁图。
    差得太离谱时往几何平均数收一收，否则窄的那张会被压成一条。
    """
    lo, hi = min(r1, r2), max(r1, r2)
    spread = hi / lo if lo else 1.0
    if spread <= max_spread:
        return r1, r2
    g = math.sqrt(r1 * r2)
    t = math.log(max_spread) / math.log(spread)
    return g * (r1 / g) ** t, g * (r2 / g) ** t


def block(items, alt_base: str, is_sub: bool = False, force: str | None = None,
          ratios: list[float] | None = None) -> str:
    """items 是 ('img', 文件名) 和 ('vid', 路径, 宽, 高) 混在一起的有序列表。

    视频包一层 <p>，跟图片渲染出来的结构完全一致 —— 这样瀑布流、
    接触表、网格都不用为视频写特例。
    """
    cls = force or layout_for(len(items), alt_base, is_sub)

    # 正好两张、又没被别的版式接管时，按比例分栏，省掉一高一矮的落差
    style = ""
    if cls == "grid-2" and ratios and len(ratios) == 2:
        a, b = pair_cols(*ratios)
        cls, style = "pair", f' style="--cols: {a:.3f}fr {b:.3f}fr"'

    solo = len(items) == 1
    out = []
    for i, it in enumerate(items):
        label = f"{alt_base} {i+1:02d}"
        if it[0] == "img":
            out.append(f"![{label}](./{it[1]})")
        else:
            _, src, w, h = it
            # 独占一格的视频给控件；混在一批里的静音循环自播，不然满屏控件条很吵
            attrs = ('controls preload="metadata"' if solo
                     else 'muted loop playsinline preload="metadata" data-autoplay')
            out.append(
                f'<p><video src="{src}" width="{w}" height="{h}" '
                f'{attrs} aria-label="{label}"></video></p>'
            )
    inner = "\n\n".join(out)
    return f'{MARK_OPEN}\n<div class="{cls}"{style}>\n\n{inner}\n\n</div>\n{MARK_CLOSE}'


def drop_key(front: str, key: str) -> str:
    """删掉 frontmatter 里的单行键（注释掉的也一起删）。"""
    return re.sub(rf"^#?\s*{key}:.*\n", "", front, flags=re.M)


def drop_block(front: str, key: str) -> str:
    """删掉 frontmatter 里的多行块（key: 后面所有缩进行）。"""
    out, skipping = [], False
    for line in front.split("\n"):
        if re.match(rf"^#?\s*{key}:\s*$", line):
            skipping = True
            continue
        if skipping:
            if line.startswith((" ", "\t", "-")) or line.strip() == "":
                continue
            skipping = False
        out.append(line)
    return "\n".join(out)


def strip_auto(text: str) -> str:
    return re.sub(re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE),
                  "", text, flags=re.S).rstrip() + "\n"


def process(project_dir: Path) -> str | None:
    slug_file = project_dir / ".slug"
    if not slug_file.exists():
        return None
    slug = slug_file.read_text().strip()
    target = PROJECTS / slug
    # 这个项目里已经压过的视频：内容指纹 → 它的地址。
    # 同一段素材在别处再出现就复用地址，不再压第二份。
    vid_by_hash: dict[str, str] = {}
    md_path = target / "index.md"
    if not md_path.exists():
        print(f"  ⚠️  找不到 {md_path}")
        return None

    md = md_path.read_text()
    front_end = md.index("---", 3)
    front, body = md[:front_end], md[front_end:]

    m = re.search(r"^title:\s*(.+)$", front, flags=re.M)
    proj_title = m.group(1).strip() if m else project_dir.name

    # 清掉上一次生成的图，避免删了图之后还留着旧文件
    vdir_old = PUBLIC / "media" / slug
    if vdir_old.exists():
        shutil.rmtree(vdir_old)
    for old in target.glob("*.jpg"):
        if re.match(r"^(cover|hero-\d{2}|[a-z0-9-]+-\d{2})\.jpg$", old.name):
            old.unlink()

    generated, skipped_video = [], []
    # 注：封面出现过的图，正文里照常出现 —— 开屏是快速预览，正文才是细看的地方

    # ---------- 封面画廊 ----------
    # 「00 封面」里可以放多张图，也可以混视频。顺序＝播放顺序。
    cover_dir = project_dir / "00 封面"
    front = re.sub(r"^# 封面图放进本文件夹.*\n", "", front, flags=re.M)
    front = drop_key(front, "cover")
    front = drop_key(front, "coverAlt")
    front = drop_block(front, "gallery")

    if cover_dir.is_dir():
        pool = [f for f in cover_dir.iterdir()
                if f.is_file() and not f.name.startswith(".")
                and f.suffix.lower() in (RASTER | VIDEO)]

        # 文件名以 card / 卡片 开头的，只当列表页缩略图，一律不进开屏画廊。
        # 卡片是 4:3 裁切的，开屏是完整不裁的，两者要的往往不是同一张。
        def is_card(f: Path) -> bool:
            n = f.stem.lower()
            return n.startswith("card") or f.stem.startswith("卡片")

        cards = sorted([f for f in pool if is_card(f)], key=lambda p: p.name.lower())
        # 同时放了图和视频就用图 —— 静帧本来就是缩略图，不用再抽帧
        card_src = next((f for f in cards if f.suffix.lower() in RASTER), None) \
            or (cards[0] if cards else None)

        media = sorted(
            [f for f in pool if not is_card(f)],
            key=lambda p: p.name.lower(),
        )

        entries, first_img, n_img, n_vid = [], None, 0, 0

        # 指定了卡片封面就先做出来，后面的自动逻辑不再覆盖它
        if card_src is not None:
            if card_src.suffix.lower() in VIDEO:
                if poster_from_video(card_src, target / "card.jpg"):
                    first_img = "card.jpg"
            elif convert(card_src, target / "card.jpg", MAX_EDGE_FULL):
                first_img = "card.jpg"
            if first_img:
                generated.append(first_img)
        # 记下封面用过的源文件名，正文里遇到同名的就跳过
        for f in media:
            if f.suffix.lower() in VIDEO:
                # 视频不走 Astro 图片管线，放 public 里直接引用
                vdir = PUBLIC / "media" / slug
                vdir.mkdir(parents=True, exist_ok=True)
                key = file_hash(f)
                if key in vid_by_hash:
                    entries.append(f'  - video: {vid_by_hash[key]}\n'
                                   f'    alt: {proj_title} — video')
                    continue
                n_vid += 1
                vname = f"hero-{n_vid:02d}.mp4"
                if not compress_video(f, vdir / vname):
                    print(f"     ⚠️  视频压缩失败，跳过：{f.name}")
                    n_vid -= 1
                    continue
                vid_by_hash[key] = f"/media/{slug}/{vname}"
                entries.append(f'  - video: /media/{slug}/{vname}\n'
                               f'    alt: {proj_title} — video {n_vid:02d}')
            else:
                n_img += 1
                out = f"hero-{n_img:02d}.jpg"
                if convert(f, target / out, MAX_EDGE_FULL):
                    generated.append(out)
                    first_img = first_img or out   # card.jpg 存在时不覆盖
                    entries.append(f'  - image: ./{out}\n'
                                   f'    alt: {proj_title} {n_img:02d}')

        # 开屏只有视频时，抽一帧当列表页缩略图
        if entries and not first_img:
            first_vid = next((f for f in media if f.suffix.lower() in VIDEO), None)
            if first_vid and poster_from_video(first_vid, target / "hero-poster.jpg"):
                first_img = "hero-poster.jpg"
                generated.append(first_img)

        if entries:
            front = front.rstrip() + "\ngallery:\n" + "\n".join(entries) + "\n"
            # 列表页的缩略图用画廊第一张图
            if first_img:
                front += f"cover: ./{first_img}\n"

    # ---------- 各章节 ----------
    # 先把正文按标题切开
    lines = body.split("\n")
    heads = [(i, l) for i, l in enumerate(lines) if re.match(r"^#{2,3} ", l)]

    # 章节文件夹（含嵌套的小节）→ 图片
    sec_images: dict[str, list[Path]] = {}
    sec_videos: dict[str, list[Path]] = {}
    for sec in sorted(project_dir.iterdir()):
        # 下划线开头 = 封存，不导入。弃用的素材原地放着就行，不用删。
        if not sec.is_dir() or sec.name == "00 封面" or sec.name.startswith("_"):
            continue
        media = media_in(sec)
        if media:
            sec_images[sec.name] = media
        for sub in sorted(sec.iterdir()):
            if sub.is_dir():
                smedia = media_in(sub)
                if smedia:
                    sec_images[sub.name] = smedia

    # 按标题倒序插入，避免行号错位
    for idx, (ln, head) in reversed(list(enumerate(heads))):
        is_sub = head.startswith("### ")
        title = re.sub(r"^#{2,3} ", "", head).strip()
        norm = re.sub(r"\s+", " ", title)
        match = next((k for k in sec_images if re.sub(r"\s+", " ", k) == norm), None)
        if not match:
            continue

        media = sec_images[match]
        base = slugify(title)
        big = (len(media) == 1 or is_finished(title)) and not is_sub
        vdir = PUBLIC / "media" / slug

        # 图和视频按原顺序逐个处理，编号连续 —— 混排的关键
        items = []
        for i, (kind, f) in enumerate(media):
            if kind == "img":
                out = f"{base}-{i+1:02d}.jpg"
                if convert(f, target / out, MAX_EDGE_FULL if big else MAX_EDGE_GRID):
                    items.append(("img", out))
                    generated.append(out)
            else:
                key = file_hash(f)
                if key in vid_by_hash:
                    # 开屏已经压过同一段了，直接复用那个地址：
                    # 一个 URL 一次下载，顺带省掉一次 ffmpeg
                    w, h = video_size(f)
                    items.append(("vid", vid_by_hash[key], w, h))
                    continue
                vname = f"{base}-{i+1:02d}.mp4"
                if compress_video(f, vdir / vname):
                    w, h = video_size(f)
                    vid_by_hash[key] = f"/media/{slug}/{vname}"
                    items.append(("vid", f"/media/{slug}/{vname}", w, h))
                    generated.append(vname)
                else:
                    skipped_video.append(f)

        if not items:
            continue

        # 章节文件夹里放个 .layout 文件（内容写版式名）就能钉死版式，
        # 用于规则算不出来的手排情况，比如「浅底一排、深底一排」
        force = None
        src_dir = next((d for d in [project_dir / match] + list(project_dir.glob("*/" + match))
                        if d.is_dir()), None)
        if src_dir and (src_dir / ".layout").exists():
            force = (src_dir / ".layout").read_text().strip() or None

        ratios = [media_ratio(f) for _, f in media] if 2 <= len(media) <= 4 else []

        # 超宽的流程图/时间轴并排会把标签压得看不清 —— 数量不多时各占一行
        if force is None and not is_sub and ratios and min(ratios) >= WIDE_RATIO:
            force = "full"

        end = heads[idx + 1][0] if idx + 1 < len(heads) else len(lines)
        section = "\n".join(lines[ln + 1:end])

        # 手排过的章节写一行 <!-- auto:skip -->，脚本就整节不碰。
        # 自动版式只认「数量 + 比例」，排不出「哪张摆哪儿」这种事；
        # 手排一次之后再跑一遍脚本，成果就没了 —— 这个标记是唯一的护栏。
        if MARK_SKIP in section:
            print(f"     · {title} 手排过，跳过")
            continue

        payload = block(items, title, is_sub, force, ratios)
        chunk = strip_auto(section)
        lines[ln + 1:end] = (chunk.rstrip() + "\n\n" + payload + "\n").split("\n")

    body = "\n".join(lines)

    # 「00 封面」空着的项目，用正文第一张图当列表页缩略图 ——
    # 卡片一直空着比用一张不那么讲究的图更糟
    if "\ncover:" not in "\n" + front:
        fallback = next((g for g in generated if g.endswith(".jpg")), None)
        if fallback:
            front = front.rstrip() + f"\ncover: ./{fallback}\n"

    md_path.write_text(front + body)

    vids = f"，跳过 {len(skipped_video)} 个视频" if skipped_video else ""
    return f"{slug}: {len(generated)} 张{vids}"


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if not STAGING.exists():
        print(f"找不到暂存文件夹：{STAGING}")
        sys.exit(1)

    print("导入中…\n")
    total = 0
    for pdir in sorted(STAGING.iterdir()):
        if not pdir.is_dir():
            continue
        sf = pdir / ".slug"
        if only and (not sf.exists() or sf.read_text().strip() != only):
            continue
        res = process(pdir)
        if res:
            print(f"  ✅ {res}")
            total += 1
    print(f"\n完成，处理了 {total} 个项目。")
    print("接着跑：npm run build 确认没问题")


if __name__ == "__main__":
    main()
