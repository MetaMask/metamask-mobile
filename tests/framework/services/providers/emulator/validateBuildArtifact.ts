/* eslint-disable import-x/no-nodejs-modules */
import fs from 'node:fs';
import path from 'node:path';

/** APKs are zip archives; a truncated CI artifact usually loses this header. */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/** E2E APKs are tens of MB; anything this small is a failed/partial download. */
const DEFAULT_MIN_APK_BYTES = 1_000_000;

/**
 * Validate a local APK before `adb install` so a corrupt or partially
 * downloaded CI artifact fails with an actionable message instead of
 * `INSTALL_PARSE_FAILED_NOT_APK` from the device.
 *
 * @returns the resolved absolute APK path.
 */
export function validateAndroidApkArtifact(
  buildPath: string,
  options: { minBytes?: number } = {},
): string {
  const { minBytes = DEFAULT_MIN_APK_BYTES } = options;
  const absApk = path.resolve(buildPath);

  if (!fs.existsSync(absApk)) {
    throw new Error(`APK does not exist at ${absApk}`);
  }

  const stats = fs.statSync(absApk);
  if (!stats.isFile()) {
    throw new Error(`APK path is not a file: ${absApk}`);
  }

  if (stats.size === 0) {
    throw new Error(
      `APK at ${absApk} is 0 bytes — the build artifact download produced an empty file.`,
    );
  }

  if (stats.size < minBytes) {
    throw new Error(
      `APK at ${absApk} is ${stats.size} bytes, smaller than the ${minBytes} byte minimum — the artifact is likely truncated. Re-run the job to download it again.`,
    );
  }

  if (!hasZipMagic(absApk)) {
    throw new Error(
      `APK at ${absApk} is not a valid APK (missing zip header) — the downloaded artifact is corrupt. Re-run the job to download it again.`,
    );
  }

  return absApk;
}

function hasZipMagic(absApk: string): boolean {
  const header = Buffer.alloc(ZIP_MAGIC.length);
  const fd = fs.openSync(absApk, 'r');
  try {
    const bytesRead = fs.readSync(fd, header, 0, ZIP_MAGIC.length, 0);
    return bytesRead === ZIP_MAGIC.length && header.equals(ZIP_MAGIC);
  } finally {
    fs.closeSync(fd);
  }
}
