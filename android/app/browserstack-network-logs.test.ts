import fs from 'fs';
import path from 'path';

const APP_DIR = __dirname;

describe('BrowserStack Android network log capture config', () => {
  const overlayConfigPath = path.join(
    APP_DIR,
    'src/browserstackNetworkLogs/res/xml/react_native_config.xml',
  );
  const buildGradlePath = path.join(APP_DIR, 'build.gradle');

  it('provides a release overlay that trusts user CAs for mitmproxy', () => {
    const xml = fs.readFileSync(overlayConfigPath, 'utf8');

    expect(xml).toContain('<certificates src="system"');
    expect(xml).toContain('<certificates src="user"');
    expect(xml).toContain('<base-config');
  });

  it('wires the overlay into release builds for BrowserStack/e2e environments', () => {
    const gradle = fs.readFileSync(buildGradlePath, 'utf8');

    expect(gradle).toContain('browserstackNetworkLogs');
    expect(gradle).toContain('IS_BROWSERSTACK_BUILD');
    expect(gradle).toMatch(/debuggable\s+true/);
  });
});
