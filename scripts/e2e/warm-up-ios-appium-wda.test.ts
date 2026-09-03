import { buildWarmUpCapabilities } from './warm-up-ios-appium-wda.mjs';

const BASE_OPTIONS = {
  udid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  wdaBundleIdBase: 'com.metamask.WebDriverAgentRunner',
  simulatorName: 'iPhone 16 Pro',
};

describe('buildWarmUpCapabilities', () => {
  it('omits WDA and MJPEG ports when they are unset', () => {
    const capabilities = buildWarmUpCapabilities(BASE_OPTIONS);

    expect(capabilities).not.toHaveProperty('appium:wdaLocalPort');
    expect(capabilities).not.toHaveProperty('appium:mjpegServerPort');
  });

  it('includes worker-specific WDA and MJPEG ports when they are set', () => {
    const capabilities = buildWarmUpCapabilities({
      ...BASE_OPTIONS,
      wdaLocalPort: 8101,
      mjpegServerPort: 9101,
    });

    expect(capabilities['appium:wdaLocalPort']).toBe(8101);
    expect(capabilities['appium:mjpegServerPort']).toBe(9101);
  });
});
