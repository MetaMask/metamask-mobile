#!/usr/bin/env bash
# Install ffmpeg for Appium XCUITest screen recording in CI.
# Uses a cached Homebrew bottle dir + Cellar snapshot under ~/.cache/mms-ffmpeg
# so subsequent runs skip downloading and compiling ffmpeg dependencies.
set -euo pipefail

CACHE_ROOT="${HOME}/.cache/mms-ffmpeg"
BREW_CACHE_DIR="${CACHE_ROOT}/brew"
CELLAR_CACHE_DIR="${CACHE_ROOT}/cellar"

export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_CACHE="${BREW_CACHE_DIR}"

mkdir -p "${BREW_CACHE_DIR}" "${CELLAR_CACHE_DIR}"

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required to install ffmpeg" >&2
  exit 1
fi

restore_cached_cellars() {
  local formula cellar_path
  shopt -s nullglob
  for cellar_path in "${CELLAR_CACHE_DIR}"/*; do
    formula="$(basename "${cellar_path}")"
    [[ "${formula}" == "ffmpeg" ]] && continue
    mkdir -p "$(brew --cellar "${formula}")"
    rsync -a "${cellar_path}/" "$(brew --cellar "${formula}")/"
    brew link "${formula}" >/dev/null 2>&1 || true
  done
  if [[ -d "${CELLAR_CACHE_DIR}/ffmpeg" ]]; then
    mkdir -p "$(brew --cellar ffmpeg)"
    rsync -a "${CELLAR_CACHE_DIR}/ffmpeg/" "$(brew --cellar ffmpeg)/"
    brew link ffmpeg >/dev/null 2>&1 || true
  fi
  shopt -u nullglob
}

cache_installed_cellars() {
  local formula
  for formula in ffmpeg $(brew deps --formula ffmpeg); do
    if [[ ! -d "$(brew --cellar "${formula}")" ]]; then
      continue
    fi
    mkdir -p "${CELLAR_CACHE_DIR}/${formula}"
    rsync -a "$(brew --cellar "${formula}")/" "${CELLAR_CACHE_DIR}/${formula}/"
  done
}

if command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg already on PATH: $(command -v ffmpeg)"
  ffmpeg -version | head -1
  exit 0
fi

restore_cached_cellars

if command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg restored from Cellar cache: $(command -v ffmpeg)"
  ffmpeg -version | head -1
  exit 0
fi

echo "Installing ffmpeg via Homebrew (bottles cached under ${BREW_CACHE_DIR})..."
brew install ffmpeg

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg install finished but binary is not on PATH" >&2
  exit 1
fi

cache_installed_cellars

echo "ffmpeg installed: $(command -v ffmpeg)"
ffmpeg -version | head -1
