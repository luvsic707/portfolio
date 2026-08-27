#!/usr/bin/env python3
"""
把桌面「作品集图片」里的图，按章节导入到各个项目，并自动排版。

用法：
    python3 tools/import-images.py            # 全部项目
    python3 tools/import-images.py eden-of-east   # 只做某一个

规则（按一节里的图片数量自动决定版式）：
    1 张      → 通栏大图（成品就该大）
    2 张      → 两列
    3 张      → 三列
    4 张      → 两列（2×2）
    5–9 张    → 三列
    10 张以上 → 四列密集网格（草稿、过程图）

可重复运行：每次都会重新生成，不会叠加。
手写的段落不会被动，脚本只管 <!-- auto:images --> 标记之间的部分。
"""

import os, re, subprocess, sys, shutil
from pathlib import Path

HOME = Path.home()
STAGING = HOME / "Desktop" / "作品集图片"
ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "src" / "content" / "projects"
PUBLIC = ROOT / "public"

RASTER = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff", ".psd", ".gif"}
VIDEO = {".mp4", ".mov", ".m4v", ".avi"}

MARK_OPEN, MARK_CLOSE = "<!-- auto:images -->", "<!-- /auto:images -->"

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


# 这些章节放的是成品，不管几张都要大图 —— 只按数量排会把主作品压成缩略图
FINISHED = ("FINAL", "OUTPUT", "OUTCOME", "STILL", "PRINT", "POSTER",
            "IMPLEMENTATION", "POSTER COMPOSITION", "POSTER")


def is_finished(title: str) -> bool:
    t = title.upper()
    return any(k in t for k in FINISHED)


def layout_for(n: int, title: str = "") -> str:
    if n == 1:
        return "full"
    # 成品章节最多两列，让画看得清
    if is_finished(title):
        return "grid-2"
    if n == 2:  return "grid-2"
    if n == 3:  return "grid-3"
    if n == 4:  return "grid-2"
    if n <= 9:  return "grid-3"
    return "grid-4"


def block(files, alt_base: str) -> str:
    cls = layout_for(len(files), alt_base)
    imgs = "\n\n".join(f"![{alt_base} {i+1:02d}](./{f})" for i, f in enumerate(files))
    return f'{MARK_OPEN}\n<div class="{cls}">\n\n{imgs}\n\n</div>\n{MARK_CLOSE}'


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
    for old in target.glob("*.jpg"):
        if re.match(r"^(cover|hero-\d{2}|[a-z0-9-]+-\d{2})\.jpg$", old.name):
            old.unlink()

    generated, skipped_video = [], []

    # ---------- 封面画廊 ----------
    # 「00 封面」里可以放多张图，也可以混视频。顺序＝播放顺序。
    cover_dir = project_dir / "00 封面"
    front = re.sub(r"^# 封面图放进本文件夹.*\n", "", front, flags=re.M)
    front = drop_key(front, "cover")
    front = drop_key(front, "coverAlt")
    front = drop_block(front, "gallery")

    if cover_dir.is_dir():
        media = sorted(
            [f for f in cover_dir.iterdir()
             if f.is_file() and not f.name.startswith(".")
             and f.suffix.lower() in (RASTER | VIDEO)],
            key=lambda p: p.name.lower(),
        )

        entries, first_img, n_img, n_vid = [], None, 0, 0
        for f in media:
            if f.suffix.lower() in VIDEO:
                # 视频不走 Astro 图片管线，放 public 里直接引用
                n_vid += 1
                vdir = PUBLIC / "media" / slug
                vdir.mkdir(parents=True, exist_ok=True)
                vname = f"hero-{n_vid:02d}{f.suffix.lower()}"
                shutil.copy2(f, vdir / vname)
                entries.append(f'  - video: /media/{slug}/{vname}\n'
                               f'    alt: {proj_title} — video {n_vid:02d}')
            else:
                n_img += 1
                out = f"hero-{n_img:02d}.jpg"
                if convert(f, target / out, MAX_EDGE_FULL):
                    generated.append(out)
                    first_img = first_img or out
                    entries.append(f'  - image: ./{out}\n'
                                   f'    alt: {proj_title} {n_img:02d}')

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
    for sec in sorted(project_dir.iterdir()):
        if not sec.is_dir() or sec.name == "00 封面":
            continue
        imgs = images_in(sec)
        if imgs:
            sec_images[sec.name] = imgs
        skipped_video += videos_in(sec)
        for sub in sorted(sec.iterdir()):
            if sub.is_dir():
                simgs = images_in(sub)
                if simgs:
                    sec_images[sub.name] = simgs
                skipped_video += videos_in(sub)

    # 按标题倒序插入，避免行号错位
    for idx, (ln, head) in reversed(list(enumerate(heads))):
        title = re.sub(r"^#{2,3} ", "", head).strip()
        norm = re.sub(r"\s+", " ", title)
        match = next((k for k in sec_images if re.sub(r"\s+", " ", k) == norm), None)
        if not match:
            continue

        files = sec_images[match]
        base = slugify(title)
        names = []
        big = len(files) == 1 or is_finished(title)
        for i, f in enumerate(files):
            out = f"{base}-{i+1:02d}.jpg"
            if convert(f, target / out, MAX_EDGE_FULL if big else MAX_EDGE_GRID):
                names.append(out)
                generated.append(out)
        if not names:
            continue

        end = heads[idx + 1][0] if idx + 1 < len(heads) else len(lines)
        chunk = strip_auto("\n".join(lines[ln + 1:end]))
        lines[ln + 1:end] = (chunk.rstrip() + "\n\n" + block(names, title) + "\n").split("\n")

    body = "\n".join(lines)
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
