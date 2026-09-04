import {
  buildWarmUpCapabilities,
  warmUpIosAppiumWdaSequentially,
} from './warm-up-ios-appium-wda.mjs';

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

describe('warmUpIosAppiumWdaSequentially', () => {
  it('does not start the next shared-Appium warm-up until the prior one resolves', async () => {
    let resolveFirstWarmUp: (() => void) | undefined;
    const firstWarmUp = new Promise<void>((resolve) => {
      resolveFirstWarmUp = resolve;
    });
    const startedUdids: string[] = [];
    const warmUp = jest.fn(async ({ udid }: { udid: string }) => {
      startedUdids.push(udid);
      if (udid === 'first-udid') {
        await firstWarmUp;
      }
      return true;
    });

    const completion = warmUpIosAppiumWdaSequentially({
      udids: ['first-udid', 'second-udid'],
      wdaBundleIdBase: BASE_OPTIONS.wdaBundleIdBase,
      simulatorName: BASE_OPTIONS.simulatorName,
      warmUp,
    });

    await Promise.resolve();
    expect(startedUdids).toEqual(['first-udid']);

    resolveFirstWarmUp?.();
    await completion;

    expect(startedUdids).toEqual(['first-udid', 'second-udid']);
    expect(warmUp).toHaveBeenNthCalledWith(1, {
      ...BASE_OPTIONS,
      udid: 'first-udid',
      wdaLocalPort: 8100,
      mjpegServerPort: 9100,
    });
    expect(warmUp).toHaveBeenNthCalledWith(2, {
      ...BASE_OPTIONS,
      udid: 'second-udid',
      wdaLocalPort: 8101,
      mjpegServerPort: 9101,
    });
  });
});
