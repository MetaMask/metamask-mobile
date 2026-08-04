/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';

import { IOSPlatformAdapter } from '../ios/platform-adapter';
import { ensureAccessibilityBridgeEnabled } from '../ios/accessibility-bridge';
import { probeHermesHealthy } from '../ios/hermes-health';
import { createIOSPlatformDriver } from '../ios/platform-driver-factory';
import { attachToMetroWatchMode } from '../ios/metro-watch-attach';
import { validateIOSPrerequisites } from '../ios/prerequisites';
import type { ResolvedIOSLaunchOptions } from '../launcher-types';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));
jest.mock('../ios/prerequisites', () => ({
  validateIOSPrerequisites: jest.fn(),
}));
jest.mock('../ios/accessibility-bridge', () => ({
  ensureAccessibilityBridgeEnabled: jest.fn(),
}));
jest.mock('../ios/hermes-health', () => ({
  probeHermesHealthy: jest.fn(),
}));
jest.mock('../ios/platform-driver-factory', () => ({
  createIOSPlatformDriver: jest.fn(),
}));
jest.mock('../ios/metro-watch-attach', () => ({
  attachToMetroWatchMode: jest.fn(),
}));

const mockExecFileSync = jest.mocked(execFileSync);
const mockValidate = jest.mocked(validateIOSPrerequisites);
const mockEnsureBridge = jest.mocked(ensureAccessibilityBridgeEnabled);
const mockProbeHermes = jest.mocked(probeHermesHealthy);
const mockCreateDriver = jest.mocked(createIOSPlatformDriver);

const resolved: ResolvedIOSLaunchOptions = {
  simulatorDeviceId: 'SIM-UDID',
  appBundlePath: '/tmp/MetaMask.app',
  appBundleId: 'io.metamask.MetaMask',
  destination: 'platform=iOS Simulator,id=SIM-UDID',
  appAlreadyInstalled: true,
  selectedAppMetadata: {
    appBundlePath: '/tmp/MetaMask.app',
    bundleId: 'io.metamask.MetaMask',
    foxCode: 'PROD',
    shortVersion: '7.35.0',
    buildVersion: '1',
  },
  installedAppMetadata: null,
  installAction: 'reuse-installed',
};

describe('IOSPlatformAdapter', () => {
  const backend = {
    openApp: jest.fn().mockResolvedValue(undefined),
    closeApp: jest.fn().mockResolvedValue(undefined),
    getAppState: jest.fn().mockResolvedValue({ state: 'Not Running' }),
  };
  const mobileDriver = {
    getAppState: jest.fn().mockResolvedValue({ isLoaded: true }),
  };
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    stderrSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    mockValidate.mockResolvedValue(resolved);
    mockEnsureBridge.mockReturnValue({ wasAlreadyOn: true });
    mockProbeHermes.mockResolvedValue({ healthy: true });
    backend.getAppState.mockResolvedValue({ state: 'Not Running' });
    mockCreateDriver.mockResolvedValue({
      backend,
      driver: mobileDriver,
    } as never);
    mockExecFileSync.mockImplementation((_file, args) =>
      (args as string[]).includes('list')
        ? JSON.stringify({
            devices: { iOS: [{ udid: 'SIM-UDID', state: 'Booted' }] },
          })
        : '',
    );
  });

  afterEach(() => stderrSpy.mockRestore());

  it('preserves installed app reuse and explicit launch', async () => {
    const adapter = new IOSPlatformAdapter();
    const options = await adapter.resolve({
      platform: 'ios',
      deviceId: 'SIM-UDID',
    });

    await adapter.launch(options);

    expect(backend.openApp).toHaveBeenCalledWith('io.metamask.MetaMask');
    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      'xcrun',
      expect.arrayContaining(['install']),
      expect.anything(),
    );
  });

  it('preserves install-new behavior', async () => {
    mockValidate.mockResolvedValueOnce({
      ...resolved,
      installAction: 'install-new',
      appAlreadyInstalled: false,
    });
    const adapter = new IOSPlatformAdapter();
    const options = await adapter.resolve({ platform: 'ios' });

    await adapter.launch(options);

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'xcrun',
      ['simctl', 'install', 'SIM-UDID', '/tmp/MetaMask.app'],
      expect.anything(),
    );
  });

  it('uninstalls before installing when reinstall is requested', async () => {
    mockValidate.mockResolvedValueOnce({
      ...resolved,
      installAction: 'reinstall',
    });
    const adapter = new IOSPlatformAdapter();
    const options = await adapter.resolve({
      platform: 'ios',
      appBundlePath: '/tmp/MetaMask.app',
      reinstall: true,
    });

    await adapter.launch(options);

    const calls = mockExecFileSync.mock.calls;
    const uninstallIndex = calls.findIndex(
      ([file, args]) =>
        file === 'xcrun' && (args as string[])[1] === 'uninstall',
    );
    const installIndex = calls.findIndex(
      ([file, args]) => file === 'xcrun' && (args as string[])[1] === 'install',
    );
    expect(uninstallIndex).toBeGreaterThanOrEqual(0);
    expect(installIndex).toBeGreaterThan(uninstallIndex);
  });

  it.each([{ reinstall: true }, { resetAppData: true }])(
    'warns when destructive flags are requested: %o',
    async (flags) => {
      const adapter = new IOSPlatformAdapter();

      await adapter.resolve({
        platform: 'ios',
        appBundlePath: '/tmp/MetaMask.app',
        ...flags,
      });

      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Using destructive flags'),
      );
    },
  );

  it('preserves simctl stderr in MM_LAUNCH_FAILED when installation fails', async () => {
    mockValidate.mockResolvedValueOnce({
      ...resolved,
      installAction: 'install-new',
      appAlreadyInstalled: false,
    });
    mockExecFileSync.mockImplementation((_file, args) => {
      if ((args as string[]).includes('list')) {
        return JSON.stringify({
          devices: { iOS: [{ udid: 'SIM-UDID', state: 'Booted' }] },
        });
      }
      if ((args as string[])[1] === 'install') {
        throw Object.assign(new Error('install failed'), {
          stderr: Buffer.from('simctl: Invalid device state'),
        });
      }
      return '';
    });
    const adapter = new IOSPlatformAdapter();
    const options = await adapter.resolve({ platform: 'ios' });

    await expect(adapter.launch(options)).rejects.toMatchObject({
      code: 'MM_LAUNCH_FAILED',
      message: expect.stringContaining('simctl: Invalid device state'),
    });
  });

  it('preserves simctl stderr and MM_DEVICE_NOT_AVAILABLE when boot fails', async () => {
    mockExecFileSync.mockImplementation((_file, args) => {
      if ((args as string[]).includes('list')) {
        return JSON.stringify({
          devices: { iOS: [{ udid: 'SIM-UDID', state: 'Shutdown' }] },
        });
      }
      if ((args as string[])[1] === 'boot') {
        throw Object.assign(new Error('boot failed'), {
          stderr: Buffer.from('simctl: Unable to boot device'),
        });
      }
      return '';
    });
    const adapter = new IOSPlatformAdapter();
    const options = await adapter.resolve({ platform: 'ios' });

    await expect(adapter.launch(options)).rejects.toMatchObject({
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message: expect.stringContaining('simctl: Unable to boot device'),
    });
  });

  it('preserves Metro deep-link launch without an extra openApp', async () => {
    mockValidate.mockResolvedValueOnce({ ...resolved, metroPort: 8081 });
    const adapter = new IOSPlatformAdapter();
    const options = await adapter.resolve(
      { platform: 'ios', metroPort: 8081 },
      8081,
    );

    await adapter.launch(options);

    expect(attachToMetroWatchMode).toHaveBeenCalledWith({
      simulatorUdid: 'SIM-UDID',
      metroPort: 8081,
      appBundleId: 'io.metamask.MetaMask',
    });
    expect(backend.openApp).not.toHaveBeenCalled();
  });

  it('preserves backend close and simctl termination cleanup', async () => {
    const adapter = new IOSPlatformAdapter();
    const options = await adapter.resolve({ platform: 'ios' });
    await adapter.launch(options);

    await adapter.cleanup();

    expect(backend.closeApp).toHaveBeenCalledWith('io.metamask.MetaMask');
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'xcrun',
      ['simctl', 'terminate', 'SIM-UDID', 'io.metamask.MetaMask'],
      expect.anything(),
    );
  });
});
