/* eslint-disable import-x/no-nodejs-modules */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateAndroidApkArtifact } from './validateBuildArtifact.ts';

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function writeApk(dir: string, name: string, contents: Buffer): string {
  const apkPath = path.join(dir, name);
  fs.writeFileSync(apkPath, contents);
  return apkPath;
}

function validApkContents(byteLength: number): Buffer {
  const body = Buffer.alloc(byteLength - ZIP_MAGIC.length, 0x41);
  return Buffer.concat([ZIP_MAGIC, body]);
}

describe('validateAndroidApkArtifact', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apk-validate-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns the resolved path for an APK with zip magic bytes and plausible size', () => {
    const apkPath = writeApk(tmpDir, 'app.apk', validApkContents(2_000_000));

    const result = validateAndroidApkArtifact(apkPath);

    expect(result).toBe(path.resolve(apkPath));
  });

  it('throws naming the missing path when the APK does not exist', () => {
    const apkPath = path.join(tmpDir, 'missing.apk');

    expect(() => validateAndroidApkArtifact(apkPath)).toThrow(
      /does not exist/i,
    );
  });

  it('throws when the APK is a directory', () => {
    const dirPath = path.join(tmpDir, 'app.apk');
    fs.mkdirSync(dirPath);

    expect(() => validateAndroidApkArtifact(dirPath)).toThrow(/not a file/i);
  });

  it('throws for an empty APK file', () => {
    const apkPath = writeApk(tmpDir, 'app.apk', Buffer.alloc(0));

    expect(() => validateAndroidApkArtifact(apkPath)).toThrow(/0 bytes/i);
  });

  it('throws for an APK smaller than the minimum plausible size', () => {
    const apkPath = writeApk(tmpDir, 'app.apk', validApkContents(1024));

    expect(() => validateAndroidApkArtifact(apkPath)).toThrow(
      /truncated|smaller than/i,
    );
  });

  it('throws for an APK without zip magic bytes', () => {
    const apkPath = writeApk(
      tmpDir,
      'app.apk',
      Buffer.concat([Buffer.from('not-a-zip'), Buffer.alloc(2_000_000, 0x41)]),
    );

    expect(() => validateAndroidApkArtifact(apkPath)).toThrow(
      /not a valid apk|zip/i,
    );
  });

  it('accepts a smaller APK when minBytes is lowered', () => {
    const apkPath = writeApk(tmpDir, 'app.apk', validApkContents(1024));

    expect(validateAndroidApkArtifact(apkPath, { minBytes: 512 })).toBe(
      path.resolve(apkPath),
    );
  });
});
