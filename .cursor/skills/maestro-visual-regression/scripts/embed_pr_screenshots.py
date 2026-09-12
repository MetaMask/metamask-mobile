#!/usr/bin/env python3
"""Upload Maestro before/after PNGs and patch the PR Screenshots/Recordings section.

Before images (base branch, usually main) go under ### **Before**.
After images (candidate branch) go under ### **After**.

Hosting: secret gist (does not add files to the product PR). GitHub renders
gist raw URLs inline in the PR body.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from resize_screenshots import DEFAULT_WIDTH, resize_png

BEFORE_HEADING = "### **Before**"
AFTER_HEADING = "### **After**"


def run(args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, check=check, text=True, capture_output=True)


def gh_json(args: list[str]):
    result = run(["gh", *args])
    return json.loads(result.stdout)


def collect_pngs(directory: Path) -> list[Path]:
    if not directory.is_dir():
        raise SystemExit(f"Not a directory: {directory}")
    pngs = sorted(p for p in directory.iterdir() if p.suffix.lower() == ".png")
    if not pngs:
        raise SystemExit(f"No PNGs in {directory}")
    return pngs


def create_gist(labeled: list[tuple[str, Path]]) -> dict:
    tmp = Path(".maestro-gist-upload")
    tmp.mkdir(exist_ok=True)
    uploaded: list[Path] = []
    try:
        for name, src in labeled:
            dest = tmp / name
            dest.write_bytes(src.read_bytes())
            resize_png(dest, DEFAULT_WIDTH)
            uploaded.append(dest)
        create = run(
            [
                "gh",
                "gist",
                "create",
                "--secret",
                "--desc",
                "Maestro visual regression screenshots (Before/After)",
                *[str(p) for p in uploaded],
            ]
        )
        gist_url = create.stdout.strip().splitlines()[-1]
        gist_id = gist_url.rstrip("/").split("/")[-1]
        return gh_json(["api", f"gists/{gist_id}"])
    finally:
        for p in uploaded:
            p.unlink(missing_ok=True)
        tmp.rmdir()


def markdown_images(files: dict, prefix: str, caption: str) -> str:
    lines = [f"_{caption}_", ""]
    matches = [
        (name, meta["raw_url"])
        for name, meta in files.items()
        if name.startswith(prefix) and name.lower().endswith(".png")
    ]
    if not matches:
        raise SystemExit(f"Gist has no files starting with {prefix}")
    for name, url in sorted(matches):
        alt = Path(name).stem.replace("-", " ")
        lines.append(f'<img src="{url}" alt="{alt}" width="{DEFAULT_WIDTH}" />')
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def replace_section(body: str, heading: str, next_heading: str, content: str) -> str:
    start = body.find(heading)
    if start < 0:
        raise SystemExit(f"PR body is missing {heading!r}")
    content_start = start + len(heading)
    end = body.find(next_heading, content_start)
    if end < 0:
        raise SystemExit(f"PR body is missing {next_heading!r} after {heading!r}")
    return body[:content_start] + "\n\n" + content + "\n" + body[end:]


def patch_body(body: str, before_md: str, after_md: str) -> str:
    # Next section after After is the author checklist heading.
    after_end_match = re.search(
        r"\n## \*\*Pre-merge author checklist\*\*",
        body,
    )
    if not after_end_match:
        raise SystemExit(
            "PR body is missing ## **Pre-merge author checklist** after After"
        )
    next_after = after_end_match.group(0).lstrip("\n")
    body = replace_section(body, BEFORE_HEADING, AFTER_HEADING, before_md)
    return replace_section(body, AFTER_HEADING, next_after, after_md)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pr", required=True, help="PR number or URL")
    parser.add_argument(
        "--before-dir",
        required=True,
        type=Path,
        help="PNGs captured on the base branch (main)",
    )
    parser.add_argument(
        "--after-dir",
        required=True,
        type=Path,
        help="PNGs captured on the candidate branch",
    )
    parser.add_argument("--base-branch", default="main")
    parser.add_argument("--candidate-branch", required=True)
    args = parser.parse_args()

    before_pngs = collect_pngs(args.before_dir)
    after_pngs = collect_pngs(args.after_dir)

    labeled: list[tuple[str, Path]] = []
    for png in before_pngs:
        labeled.append((f"before-{png.name}", png))
    for png in after_pngs:
        labeled.append((f"after-{png.name}", png))

    gist = create_gist(labeled)
    files = gist["files"]
    before_md = markdown_images(
        files, "before-", f"Before (`{args.base_branch}`)"
    )
    after_md = markdown_images(
        files, "after-", f"After (`{args.candidate_branch}`)"
    )

    pr = gh_json(["pr", "view", str(args.pr), "--json", "number,body,url"])
    new_body = patch_body(pr["body"], before_md, after_md)
    body_file = Path(".maestro-pr-body.md")
    body_file.write_text(new_body, encoding="utf-8")
    try:
        run(["gh", "pr", "edit", str(pr["number"]), "--body-file", str(body_file)])
    finally:
        body_file.unlink(missing_ok=True)

    print(f"Updated Screenshots/Recordings on {pr['url']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
