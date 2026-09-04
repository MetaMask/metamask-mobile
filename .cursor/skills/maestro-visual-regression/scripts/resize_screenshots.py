#!/usr/bin/env python3
"""Downscale Maestro PNGs to the default PR width (390). Does not upscale."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

DEFAULT_WIDTH = 390


def run(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, check=True, text=True, capture_output=True)


def pixel_width(path: Path) -> int:
    result = run(["sips", "-g", "pixelWidth", str(path)])
    for line in result.stdout.splitlines():
        if "pixelWidth" in line:
            return int(line.split()[-1])
    raise SystemExit(f"Could not read pixelWidth for {path}")


def resize_png(path: Path, width: int = DEFAULT_WIDTH) -> bool:
    """Resample to `width` if wider. Returns True when the file was rewritten."""
    current = pixel_width(path)
    if current <= width:
        return False
    run(["sips", "--resampleWidth", str(width), str(path)])
    return True


def resize_dir(directory: Path, width: int = DEFAULT_WIDTH) -> int:
    if not directory.is_dir():
        raise SystemExit(f"Not a directory: {directory}")
    changed = 0
    for png in sorted(p for p in directory.iterdir() if p.suffix.lower() == ".png"):
        if resize_png(png, width):
            changed += 1
    return changed


def main() -> int:
    parser = argparse.ArgumentParser(
        description=f"Downscale PNGs to {DEFAULT_WIDTH}px width (keeps aspect ratio)."
    )
    parser.add_argument(
        "dirs",
        nargs="+",
        type=Path,
        help="Directories of PNGs (e.g. maestro/before maestro/after)",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=DEFAULT_WIDTH,
        help=f"Target width in pixels (default {DEFAULT_WIDTH})",
    )
    args = parser.parse_args()
    total = 0
    for directory in args.dirs:
        total += resize_dir(directory, args.width)
    print(f"Resized {total} PNG(s) to width {args.width}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
