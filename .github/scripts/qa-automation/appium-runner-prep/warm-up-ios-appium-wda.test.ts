import {
  buildWarmUpCapabilities,
  recoverFailedWdaWarmUp,
  warmUpIosAppiumWda,
  warmUpIosAppiumWdaPool,
} from './warm-up-ios-appium-wda.mjs';

const BASE_OPTIONS = {
  udid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  wdaBundleIdBase: 'com.metamask.WebDriverAgentRunner',
  simulatorName: 'iPhone 16 Pro',
};

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

describe('buildWarmUpCapabilities', () => {
  const originalDerivedDataPath = process.env['WDA_DERIVED_DATA_PATH'];

  afterEach(() => {
    restoreEnv('WDA_DERIVED_DATA_PATH', originalDerivedDataPath);
  });

  it('uses WDA_DERIVED_DATA_PATH for the warm-up derived data path', () => {
    process.env['WDA_DERIVED_DATA_PATH'] = '/opt/wda-derived-data';

    const capabilities = buildWarmUpCapabilities(BASE_OPTIONS);

    expect(capabilities['appium:derivedDataPath']).toBe('/opt/wda-derived-data');
  });

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

describe('warmUpIosAppiumWdaPool', () => {
  it('starts all warm-ups concurrently — second begins before first resolves', async () => {
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

    const completion = warmUpIosAppiumWdaPool({
      udids: ['first-udid', 'second-udid'],
      wdaBundleIdBase: BASE_OPTIONS.wdaBundleIdBase,
      simulatorName: BASE_OPTIONS.simulatorName,
      warmUp,
    });

    // Both UDIDs should be started before any resolves (parallel, not sequential).
    await Promise.resolve();
    expect(startedUdids).toEqual(['first-udid', 'second-udid']);

    resolveFirstWarmUp?.();
    await completion;

    expect(warmUp).toHaveBeenCalledWith({
      ...BASE_OPTIONS,
      udid: 'first-udid',
      wdaLocalPort: 8100,
      mjpegServerPort: 9100,
    });
    expect(warmUp).toHaveBeenCalledWith({
      ...BASE_OPTIONS,
      udid: 'second-udid',
      wdaLocalPort: 8101,
      mjpegServerPort: 9101,
    });
  });

  it('assigns distinct ports to each pool index', async () => {
    const warmUp = jest.fn().mockResolvedValue(true);

    await warmUpIosAppiumWdaPool({
      udids: ['udid-0', 'udid-1', 'udid-2'],
      wdaBundleIdBase: BASE_OPTIONS.wdaBundleIdBase,
      simulatorName: BASE_OPTIONS.simulatorName,
      warmUp,
    });

    expect(warmUp).toHaveBeenCalledWith(expect.objectContaining({ udid: 'udid-0', wdaLocalPort: 8100, mjpegServerPort: 9100 }));
    expect(warmUp).toHaveBeenCalledWith(expect.objectContaining({ udid: 'udid-1', wdaLocalPort: 8101, mjpegServerPort: 9101 }));
    expect(warmUp).toHaveBeenCalledWith(expect.objectContaining({ udid: 'udid-2', wdaLocalPort: 8102, mjpegServerPort: 9102 }));
  });
});

describe('warmUpIosAppiumWda', () => {
  const launchError = new Error(
    'Failed to start the preinstalled WebDriverAgent in 120000 ms',
  );

  function stubWarmUp(createSession: jest.Mock) {
    return warmUpIosAppiumWda({
      ...BASE_OPTIONS,
      createSession,
      recoverSimulator: jest.fn().mockResolvedValue(undefined),
      ensureBooted: jest.fn().mockResolvedValue(undefined),
      startServer: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
    });
  }

  it('reboots and reinstalls WDA before the second warm-up attempt', async () => {
    const recoverSimulator = jest.fn().mockResolvedValue(undefined);
    const createSession = jest
      .fn()
      .mockRejectedValueOnce(launchError)
      .mockResolvedValueOnce(undefined);

    await warmUpIosAppiumWda({
      ...BASE_OPTIONS,
      createSession,
      recoverSimulator,
      ensureBooted: jest.fn().mockResolvedValue(undefined),
      startServer: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
    });

    expect(recoverSimulator).toHaveBeenCalledTimes(1);
    expect(recoverSimulator).toHaveBeenCalledWith({ udid: BASE_OPTIONS.udid });
    expect(createSession).toHaveBeenCalledTimes(2);
  });

  it('does not recover a simulator whose first warm-up succeeded', async () => {
    const recoverSimulator = jest.fn().mockResolvedValue(undefined);

    await warmUpIosAppiumWda({
      ...BASE_OPTIONS,
      createSession: jest.fn().mockResolvedValue(undefined),
      recoverSimulator,
      ensureBooted: jest.fn().mockResolvedValue(undefined),
      startServer: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
    });

    expect(recoverSimulator).not.toHaveBeenCalled();
  });

  it('throws the last launch error after recovery still fails', async () => {
    const createSession = jest.fn().mockRejectedValue(launchError);

    await expect(stubWarmUp(createSession)).rejects.toThrow(
      'Failed to start the preinstalled WebDriverAgent',
    );
    expect(createSession).toHaveBeenCalledTimes(2);
  });
});

describe('recoverFailedWdaWarmUp', () => {
  it('shuts the simulator down, boots it, and reinstalls the cached WDA app', async () => {
    const shutdown = jest.fn().mockResolvedValue(undefined);
    const boot = jest.fn().mockResolvedValue(BASE_OPTIONS.udid);
    const install = jest.fn().mockResolvedValue('com.facebook.WebDriverAgentRunner.xctrunner');
    const wdaApp =
      '/Users/runner/work/metamask-mobile/metamask-mobile/.cache/appium-wda/Build/Products/WebDriverAgentRunner-Runner.app';

    await recoverFailedWdaWarmUp({
      udid: BASE_OPTIONS.udid,
      shutdown,
      boot,
      install,
      findArtifacts: () => ({ wdaApp }),
    });

    expect(shutdown).toHaveBeenCalledWith(BASE_OPTIONS.udid);
    expect(boot).toHaveBeenCalledWith(BASE_OPTIONS.udid);
    expect(install).toHaveBeenCalledWith({
      udid: BASE_OPTIONS.udid,
      wdaApp,
    });
    expect(boot.mock.invocationCallOrder[0]).toBeGreaterThan(
      shutdown.mock.invocationCallOrder[0],
    );
    expect(install.mock.invocationCallOrder[0]).toBeGreaterThan(
      boot.mock.invocationCallOrder[0],
    );
  });
});
