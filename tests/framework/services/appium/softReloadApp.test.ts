import {
  softReloadAppForFixtures,
  type SoftReloadDeviceCommands,
  type SoftReloadFixtureServer,
} from './softReloadApp.ts';
import type { CurrentDeviceDetails } from '../../fixtures/playwright';
import AndroidWebViewCdpHelpers from '../../AndroidWebViewCdpHelpers.ts';
import ChromeCdpHelpers from '../../ChromeCdpHelpers.ts';
import AppiumUtilities from '../../AppiumUtilities.ts';
import { shouldHandleMetroDevLauncherLocally } from '../../Constants.ts';
import { PlatformDetector } from '../../PlatformLocator.ts';
import { switchToNativeContext } from './sessionHealth.ts';
import { dismissDevelopmentServerPickerPlaywright } from '../../../flows/general.flow';
import {
  consumeSharedSessionRecreate,
  resetSharedSessionRecreateState,
} from './sessionRecovery.ts';

jest.mock('../../AndroidWebViewCdpHelpers.ts', () => ({
  __esModule: true,
  default: {
    resetCache: jest.fn(),
  },
}));

jest.mock('../../ChromeCdpHelpers.ts', () => ({
  __esModule: true,
  default: {
    resetMetaMaskWebViewCache: jest.fn(),
  },
}));

jest.mock('../../AppiumUtilities.ts', () => ({
  __esModule: true,
  default: {
    launchApp: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../Constants.ts', () => ({
  ...jest.requireActual('../../Constants.ts'),
  resolveE2EFixtureBootstrapTimeoutMs: jest.fn(() => 5_000),
  shouldHandleMetroDevLauncherLocally: jest.fn(() => false),
}));

jest.mock('../../PlatformLocator.ts', () => ({
  PlatformDetector: {
    isAndroid: jest.fn(() => true),
    isIOS: jest.fn(() => false),
  },
}));

jest.mock('./sessionHealth.ts', () => ({
  switchToNativeContext: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../flows/general.flow', () => ({
  dismissDevelopmentServerPickerPlaywright: jest
    .fn()
    .mockResolvedValue(undefined),
}));

const launchAppMock = AppiumUtilities.launchApp as jest.MockedFunction<
  typeof AppiumUtilities.launchApp
>;
const switchToNativeContextMock = switchToNativeContext as jest.MockedFunction<
  typeof switchToNativeContext
>;
const shouldHandleMetroMock =
  shouldHandleMetroDevLauncherLocally as jest.MockedFunction<
    typeof shouldHandleMetroDevLauncherLocally
  >;
const dismissMetroMock =
  dismissDevelopmentServerPickerPlaywright as jest.MockedFunction<
    typeof dismissDevelopmentServerPickerPlaywright
  >;
const isAndroidMock = PlatformDetector.isAndroid as jest.MockedFunction<
  typeof PlatformDetector.isAndroid
>;

const createDrv = (
  overrides: Partial<{ isExisting: jest.Mock }> = {},
): WebdriverIO.Browser => {
  const isExisting =
    overrides.isExisting ?? jest.fn().mockResolvedValue(false);
  return {
    sessionId: 's1',
    $: jest.fn().mockReturnValue({ isExisting }),
  } as unknown as WebdriverIO.Browser;
};

describe('softReloadAppForFixtures', () => {
  const currentDeviceDetails: CurrentDeviceDetails = {
    platform: 'android',
    deviceName: 'Pixel_5',
    udid: 'emulator-5554',
    packageName: 'io.metamask',
    launchableActivity: 'io.metamask.MainActivity',
    isBrowserstack: false,
  };

  let fixtureServer: SoftReloadFixtureServer;
  let deviceCommands: SoftReloadDeviceCommands;
  let waitForNextStateRequest: jest.Mock;
  let clearAppData: jest.Mock;

  beforeEach(() => {
    waitForNextStateRequest = jest.fn().mockResolvedValue(undefined);
    clearAppData = jest.fn().mockResolvedValue(undefined);
    fixtureServer = { waitForNextStateRequest };
    deviceCommands = { clearAppData };
    shouldHandleMetroMock.mockReturnValue(false);
    isAndroidMock.mockReturnValue(true);
    switchToNativeContextMock.mockResolvedValue(true);
    launchAppMock.mockResolvedValue(undefined);
    dismissMetroMock.mockResolvedValue(undefined);
    resetSharedSessionRecreateState();
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetSharedSessionRecreateState();
  });

  it('clears app data, resets NATIVE_APP context, launches, and waits for bootstrap', async () => {
    const drv = createDrv();
    const launchArgs = { fixtureServerPort: '1234' };

    const result = await softReloadAppForFixtures({
      currentDeviceDetails,
      deviceCommands,
      launchArgs,
      fixtureServer,
      drv,
    });

    expect(AndroidWebViewCdpHelpers.resetCache).toHaveBeenCalled();
    expect(ChromeCdpHelpers.resetMetaMaskWebViewCache).toHaveBeenCalled();
    expect(clearAppData).toHaveBeenCalledTimes(1);
    expect(switchToNativeContextMock).toHaveBeenCalledWith(drv);
    expect(waitForNextStateRequest).toHaveBeenCalledWith(5_000);
    expect(launchAppMock).toHaveBeenCalledWith(currentDeviceDetails, {
      launchArgs,
    });
    expect(drv.$).toHaveBeenCalled();
    expect(result.attemptedMetroDevLauncherDismissal).toBe(false);
    expect(result.clearAppDataMs).toBeGreaterThanOrEqual(0);
    expect(result.contextResetMs).toBeGreaterThanOrEqual(0);
    expect(result.launchAppMs).toBeGreaterThanOrEqual(0);
    expect(result.fixtureBootstrapMs).toBeGreaterThanOrEqual(0);
  });

  it('skips clearAppData when deviceCommands is omitted', async () => {
    await softReloadAppForFixtures({
      currentDeviceDetails,
      launchArgs: {},
      fixtureServer,
      drv: createDrv(),
    });

    expect(clearAppData).not.toHaveBeenCalled();
    expect(launchAppMock).toHaveBeenCalledTimes(1);
  });

  it('registers bootstrap waiter before launching the app', async () => {
    const callOrder: string[] = [];
    waitForNextStateRequest.mockImplementation(async () => {
      callOrder.push('wait');
    });
    launchAppMock.mockImplementation(async () => {
      callOrder.push('launch');
    });

    await softReloadAppForFixtures({
      currentDeviceDetails,
      deviceCommands,
      launchArgs: {},
      fixtureServer,
      drv: createDrv(),
    });

    expect(callOrder.indexOf('wait')).toBeLessThan(callOrder.indexOf('launch'));
  });

  it('runs metro dismissal loop when local Metro launch handling is enabled', async () => {
    shouldHandleMetroMock.mockReturnValue(true);

    const result = await softReloadAppForFixtures({
      currentDeviceDetails,
      deviceCommands,
      launchArgs: {},
      fixtureServer,
      drv: createDrv(),
    });

    expect(result.attemptedMetroDevLauncherDismissal).toBe(true);
    expect(dismissMetroMock).toHaveBeenCalled();
  });

  it('retries clearAppData once then continues', async () => {
    clearAppData
      .mockRejectedValueOnce(new Error('Command failed: adb shell pm clear'))
      .mockResolvedValueOnce(undefined);

    await softReloadAppForFixtures({
      currentDeviceDetails,
      deviceCommands,
      launchArgs: {},
      fixtureServer,
      drv: createDrv(),
    });

    expect(clearAppData).toHaveBeenCalledTimes(2);
    expect(consumeSharedSessionRecreate()).toBe(false);
  });

  it('requests shared session recreate when clearAppData keeps failing', async () => {
    clearAppData.mockRejectedValue(
      new Error('Command failed: adb shell pm clear io.metamask'),
    );

    await expect(
      softReloadAppForFixtures({
        currentDeviceDetails,
        deviceCommands,
        launchArgs: {},
        fixtureServer,
        drv: createDrv(),
      }),
    ).rejects.toThrow(/pm clear/);

    expect(clearAppData).toHaveBeenCalledTimes(2);
    expect(consumeSharedSessionRecreate()).toBe(true);
  });

  it('fails fast and requests recreate when UiAutomator2 is dead after soft reload', async () => {
    const drv = createDrv({
      isExisting: jest.fn().mockRejectedValue(
        new Error(
          "'POST /element' cannot be proxied to UiAutomator2 server because the instrumentation process is not running (probably crashed).",
        ),
      ),
    });

    await expect(
      softReloadAppForFixtures({
        currentDeviceDetails,
        deviceCommands,
        launchArgs: {},
        fixtureServer,
        drv,
      }),
    ).rejects.toThrow(/instrumentation process is not running/);

    expect(consumeSharedSessionRecreate()).toBe(true);
  });
});
