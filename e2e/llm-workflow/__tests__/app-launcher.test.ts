/* eslint-disable import/no-nodejs-modules */
import { existsSync } from 'fs';
import { execFile as execFileCb } from 'node:child_process';
/* eslint-enable import/no-nodejs-modules */
import {
  MetaMaskMobileAppLauncher,
  launchMetaMaskMobile,
} from '../app-launcher';
import {
  IOSPlatformDriver,
  XCUITestClient,
  bootDevice,
  isBooted,
  launchApp,
  terminateApp,
  startRunner,
  stopRunner,
  waitForReady,
  setPlatformDriver,
  clearPlatformDriver,
} from '@metamask/client-mcp-core';

jest.mock('fs');
jest.mock('node:child_process');
jest.mock('@metamask/client-mcp-core');

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockBootDevice = bootDevice as jest.MockedFunction<typeof bootDevice>;
const mockIsBooted = isBooted as jest.MockedFunction<typeof isBooted>;
const mockLaunchApp = launchApp as jest.MockedFunction<typeof launchApp>;
const mockTerminateApp = terminateApp as jest.MockedFunction<
  typeof terminateApp
>;
const mockStartRunner = startRunner as jest.MockedFunction<typeof startRunner>;
const mockStopRunner = stopRunner as jest.MockedFunction<typeof stopRunner>;
const mockWaitForReady = waitForReady as jest.MockedFunction<
  typeof waitForReady
>;
const mockSetPlatformDriver = setPlatformDriver as jest.MockedFunction<
  typeof setPlatformDriver
>;
const mockClearPlatformDriver = clearPlatformDriver as jest.MockedFunction<
  typeof clearPlatformDriver
>;
const MockedIOSPlatformDriver = IOSPlatformDriver as jest.MockedClass<
  typeof IOSPlatformDriver
>;
const MockedXCUITestClient = XCUITestClient as jest.MockedClass<
  typeof XCUITestClient
>;

describe('MetaMaskMobileAppLauncher', () => {
  let appLauncher: MetaMaskMobileAppLauncher;

  beforeEach(() => {
    jest.clearAllMocks();

    mockExistsSync.mockReturnValue(true);
    mockIsBooted.mockResolvedValue(true);
    mockBootDevice.mockResolvedValue(undefined);
    mockLaunchApp.mockResolvedValue(undefined);
    mockTerminateApp.mockResolvedValue(undefined);
    mockStartRunner.mockResolvedValue(8100);
    mockStopRunner.mockReturnValue(undefined);
    mockWaitForReady.mockResolvedValue(true);
    mockSetPlatformDriver.mockReturnValue(undefined);
    mockClearPlatformDriver.mockReturnValue(undefined);

    const mockExecFile = execFileCb as unknown as jest.Mock;
    mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
      if (callback) {
        callback(null, '', '');
      }
      return {} as never;
    });

    appLauncher = new MetaMaskMobileAppLauncher();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('launch', () => {
    const validOptions = {
      simulatorDeviceId: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      appBundlePath: '/path/to/MetaMask.app',
      anvilPort: 8545,
      fixtureServerPort: 12345,
    };

    it('launches app successfully with valid options', async () => {
      const result = await appLauncher.launch(validOptions);

      expect(result).toEqual({
        simulatorDeviceId: validOptions.simulatorDeviceId,
        runnerPort: 8100,
        appBundleId: 'io.metamask',
      });
      expect(mockLaunchApp).toHaveBeenCalledWith(
        validOptions.simulatorDeviceId,
        'io.metamask',
      );
      expect(mockStartRunner).toHaveBeenCalled();
      expect(mockSetPlatformDriver).toHaveBeenCalled();
    });

    it('throws error when simulatorDeviceId is missing', async () => {
      const invalidOptions = {
        ...validOptions,
        simulatorDeviceId: '',
      };

      await expect(appLauncher.launch(invalidOptions)).rejects.toThrow(
        'simulatorDeviceId is required',
      );
    });

    it('throws error when appBundlePath is missing', async () => {
      const invalidOptions = {
        ...validOptions,
        appBundlePath: '',
      };

      await expect(appLauncher.launch(invalidOptions)).rejects.toThrow(
        'appBundlePath is required',
      );
    });

    it('throws error when app bundle does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(appLauncher.launch(validOptions)).rejects.toThrow(
        'App bundle not found',
      );
    });

    it('throws error when already launched', async () => {
      await appLauncher.launch(validOptions);

      await expect(appLauncher.launch(validOptions)).rejects.toThrow(
        'App is already launched',
      );
    });

    it('boots simulator when not already booted', async () => {
      mockIsBooted.mockResolvedValue(false);

      await appLauncher.launch(validOptions);

      expect(mockBootDevice).toHaveBeenCalledWith(
        validOptions.simulatorDeviceId,
      );
    });

    it('skips booting when simulator already booted', async () => {
      mockIsBooted.mockResolvedValue(true);

      await appLauncher.launch(validOptions);

      expect(mockBootDevice).not.toHaveBeenCalled();
    });

    it('creates XCUITestClient with runner port', async () => {
      mockStartRunner.mockResolvedValue(9999);

      await appLauncher.launch(validOptions);

      expect(MockedXCUITestClient).toHaveBeenCalledWith({ port: 9999 });
    });

    it('creates IOSPlatformDriver with XCUITestClient', async () => {
      await appLauncher.launch(validOptions);

      expect(MockedIOSPlatformDriver).toHaveBeenCalledWith(
        expect.any(Object),
        validOptions.simulatorDeviceId,
        expect.objectContaining({
          screenshotDir: '/tmp/ios-screenshots',
        }),
      );
    });

    it('registers platform driver globally', async () => {
      await appLauncher.launch(validOptions);

      expect(mockSetPlatformDriver).toHaveBeenCalled();
    });

    it('performs health check on XCUITest runner', async () => {
      await appLauncher.launch(validOptions);

      expect(mockWaitForReady).toHaveBeenCalled();
    });

    it('throws error when health check fails', async () => {
      mockWaitForReady.mockResolvedValue(false);

      await expect(appLauncher.launch(validOptions)).rejects.toThrow(
        'health check failed',
      );
    });

    it('cleans up on launch failure', async () => {
      mockStartRunner.mockRejectedValue(new Error('Runner failed'));

      await expect(appLauncher.launch(validOptions)).rejects.toThrow(
        'Runner failed',
      );

      expect(mockStopRunner).toHaveBeenCalled();
      expect(mockClearPlatformDriver).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    const validOptions = {
      simulatorDeviceId: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      appBundlePath: '/path/to/MetaMask.app',
      anvilPort: 8545,
      fixtureServerPort: 12345,
    };

    it('stops runner and clears platform driver', async () => {
      await appLauncher.launch(validOptions);

      await appLauncher.stop();

      expect(mockStopRunner).toHaveBeenCalled();
      expect(mockClearPlatformDriver).toHaveBeenCalled();
    });

    it('terminates app on simulator', async () => {
      await appLauncher.launch(validOptions);

      await appLauncher.stop();

      expect(mockTerminateApp).toHaveBeenCalledWith(
        validOptions.simulatorDeviceId,
        'io.metamask',
      );
    });

    it('handles stop errors gracefully', async () => {
      await appLauncher.launch(validOptions);
      mockStopRunner.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      await expect(appLauncher.stop()).resolves.not.toThrow();
    });

    it('does nothing when not launched', async () => {
      await appLauncher.stop();

      expect(mockStopRunner).toHaveBeenCalled();
      expect(mockTerminateApp).not.toHaveBeenCalled();
    });
  });

  describe('getIsLaunched', () => {
    const validOptions = {
      simulatorDeviceId: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      appBundlePath: '/path/to/MetaMask.app',
      anvilPort: 8545,
      fixtureServerPort: 12345,
    };

    it('returns false when not launched', () => {
      const result = appLauncher.getIsLaunched();

      expect(result).toBe(false);
    });

    it('returns true when launched', async () => {
      await appLauncher.launch(validOptions);

      const result = appLauncher.getIsLaunched();

      expect(result).toBe(true);
    });

    it('returns false after stopped', async () => {
      await appLauncher.launch(validOptions);
      await appLauncher.stop();

      const result = appLauncher.getIsLaunched();

      expect(result).toBe(false);
    });
  });

  describe('getDriver', () => {
    const validOptions = {
      simulatorDeviceId: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      appBundlePath: '/path/to/MetaMask.app',
      anvilPort: 8545,
      fixtureServerPort: 12345,
    };

    it('returns undefined when not launched', () => {
      const result = appLauncher.getDriver();

      expect(result).toBeUndefined();
    });

    it('returns IOSPlatformDriver when launched', async () => {
      await appLauncher.launch(validOptions);

      const result = appLauncher.getDriver();

      expect(result).toBeDefined();
    });
  });

  describe('getRunnerPort', () => {
    const validOptions = {
      simulatorDeviceId: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      appBundlePath: '/path/to/MetaMask.app',
      anvilPort: 8545,
      fixtureServerPort: 12345,
    };

    it('returns undefined when not launched', () => {
      const result = appLauncher.getRunnerPort();

      expect(result).toBeUndefined();
    });

    it('returns runner port when launched', async () => {
      mockStartRunner.mockResolvedValue(9999);

      await appLauncher.launch(validOptions);

      const result = appLauncher.getRunnerPort();

      expect(result).toBe(9999);
    });
  });

  describe('launchMetaMaskMobile', () => {
    const validOptions = {
      simulatorDeviceId: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      appBundlePath: '/path/to/MetaMask.app',
      anvilPort: 8545,
      fixtureServerPort: 12345,
    };

    it('creates and launches app launcher', async () => {
      const launcher = await launchMetaMaskMobile(validOptions);

      expect(launcher).toBeInstanceOf(MetaMaskMobileAppLauncher);
      expect(launcher.getIsLaunched()).toBe(true);
    });
  });
});
