const {
  assertBrowserStackAppUrl,
  assertBrowserStackCustomId,
  writeGithubOutputs,
} = require('./browserstack-app-validation.cjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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

  it('accepts expected custom_id formats', () => {
    expect(assertBrowserStackCustomId('MetaMask-Android-With-SRP-123', 'with-srp')).toBe(
      'MetaMask-Android-With-SRP-123',
    );
    expect(
      assertBrowserStackCustomId(
        'MetaMask-Android-Without-SRP-456',
        'without-srp',
      ),
    ).toBe('MetaMask-Android-Without-SRP-456');
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
