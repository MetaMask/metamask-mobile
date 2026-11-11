#!/usr/bin/env bash
# Install a pinned static ffmpeg for Appium XCUITest screen recording.
# Avoids Homebrew: brew install / brew update can hang indefinitely on CI.
# Failure is non-fatal — iOS recording is already best-effort in the test runner.
set -euo pipefail

CACHE_ROOT="${HOME}/.cache/mms-ffmpeg"
BIN_DIR="${CACHE_ROOT}/bin"
BIN_PATH="${BIN_DIR}/ffmpeg"
FFMPEG_VERSION='b6.1.1'
DOWNLOAD_TIMEOUT_SEC="${FFMPEG_DOWNLOAD_TIMEOUT_SEC:-45}"

skip_without_ffmpeg() {
  echo "::warning::ffmpeg unavailable — XCUITest failure videos will be skipped. $1"
  exit 0
}

export_bin_dir() {
  if [[ -n "${GITHUB_PATH:-}" ]]; then
    echo "${BIN_DIR}" >> "${GITHUB_PATH}"
  fi
  export PATH="${BIN_DIR}:${PATH}"
}

ffmpeg_ok() {
  command -v ffmpeg >/dev/null 2>&1 && ffmpeg -version >/dev/null 2>&1
}

if ffmpeg_ok; then
  echo "ffmpeg already on PATH: $(command -v ffmpeg)"
  ffmpeg -version | head -1
  exit 0
fi

mkdir -p "${BIN_DIR}"

if [[ -x "${BIN_PATH}" ]] && "${BIN_PATH}" -version >/dev/null 2>&1; then
  echo "ffmpeg restored from cache: ${BIN_PATH}"
  "${BIN_PATH}" -version | head -1
  export_bin_dir
  exit 0
fi

arch="$(uname -m)"
case "${arch}" in
  arm64)
    asset='ffmpeg-darwin-arm64.gz'
    sha256='8923876afa8db5585022d7860ec7e589af192f441c56793971276d450ed3bbfa'
    ;;
  x86_64)
    asset='ffmpeg-darwin-x64.gz'
    sha256='929b375c1182d956c51f7ac25e0b2b0411fb01f6f407aa15c9758efeb4242106'
    ;;
  *)
    skip_without_ffmpeg "unsupported arch ${arch}"
    ;;
esac

url="https://github.com/eugeneware/ffmpeg-static/releases/download/${FFMPEG_VERSION}/${asset}"
archive="${CACHE_ROOT}/${asset}"

echo "Downloading static ffmpeg ${FFMPEG_VERSION} (${asset})..."
if ! curl --fail --location --silent --show-error \
  --max-time "${DOWNLOAD_TIMEOUT_SEC}" \
  --retry 2 \
  --retry-delay 2 \
  --output "${archive}" \
  "${url}"; then
  skip_without_ffmpeg "download failed or timed out after ${DOWNLOAD_TIMEOUT_SEC}s"
fi

actual="$(shasum -a 256 "${archive}" | awk '{print $1}')"
if [[ "${actual}" != "${sha256}" ]]; then
  rm -f "${archive}"
  skip_without_ffmpeg "checksum mismatch (got ${actual})"
fi

if ! gzip -dc "${archive}" > "${BIN_PATH}"; then
  rm -f "${archive}" "${BIN_PATH}"
  skip_without_ffmpeg "failed to decompress ffmpeg"
fi
chmod +x "${BIN_PATH}"
rm -f "${archive}"

if ! "${BIN_PATH}" -version >/dev/null 2>&1; then
  rm -f "${BIN_PATH}"
  skip_without_ffmpeg "downloaded binary failed ffmpeg -version"
fi

echo "ffmpeg installed: ${BIN_PATH}"
"${BIN_PATH}" -version | head -1
export_bin_dir
