import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const {
  assertBrowserStackAppUrl,
  assertBrowserStackCustomId,
  writeGithubOutputs,
} = require('./browserstack-app-validation.cjs');

describe('browserstack-app-validation', () => {
  it('accepts valid BrowserStack app URLs', () => {
    expect(assertBrowserStackAppUrl('bs://abc123DEF', 'test')).toBe(
      'bs://abc123DEF',
    );
  });

  it('rejects malformed BrowserStack app URLs', () => {
    expect(() =>
      assertBrowserStackAppUrl('https://evil.example/app', 'test'),
    ).toThrow('Invalid test');
    expect(() =>
      assertBrowserStackAppUrl('bs://bad chars', 'test'),
    ).toThrow('Invalid test');
  });

  it('accepts expected custom_id formats with branch slug', () => {
    expect(
      assertBrowserStackCustomId(
        'MetaMask-Android-With-SRP-main-123',
        'with-srp',
      ),
    ).toBe('MetaMask-Android-With-SRP-main-123');
    expect(
      assertBrowserStackCustomId(
        'MetaMask-Android-Without-SRP-main-456',
        'without-srp',
      ),
    ).toBe('MetaMask-Android-Without-SRP-main-456');
    expect(
      assertBrowserStackCustomId(
        'MetaMask-Android-With-SRP-feature_x-789',
        'with-srp',
      ),
    ).toBe('MetaMask-Android-With-SRP-feature_x-789');
  });

  it('rejects legacy custom_id formats without branch slug', () => {
    expect(() =>
      assertBrowserStackCustomId('MetaMask-Android-With-SRP-123', 'with-srp'),
    ).toThrow('Invalid with-srp custom_id');
  });

  it('writes only validated single-line GitHub outputs', () => {
    const outputPath = path.join(os.tmpdir(), `gh-output-${Date.now()}.txt`);
    writeGithubOutputs(outputPath, {
      found: 'true',
      'with-srp-browserstack-url': 'bs://abc123',
    });

    expect(fs.readFileSync(outputPath, 'utf8')).toBe(
      'found=true\nwith-srp-browserstack-url=bs://abc123\n',
    );
    fs.unlinkSync(outputPath);
  });
});
