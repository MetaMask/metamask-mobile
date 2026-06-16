/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

import {
  validateIOSPrerequisites,
  readAppBundleMetadata,
} from '../ios/prerequisites';
import { IOSLaunchError } from '../launcher-types';
import { resolveRepoRoot } from '../resolve-repo-root';

jest.mock('node:child_process', () => ({
  execFileSync: jest.fn(),
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('../resolve-repo-root', () => ({
  resolveRepoRoot: jest.fn().mockReturnValue('/repo'),
}));

const mockedExecFileSync = jest.mocked(execFileSync);
const mockedExistsSync = jest.mocked(existsSync);
const mockedResolveRepoRoot = jest.mocked(resolveRepoRoot);

const BOOTED_UDID = 'BOOTED-UDID-1234';
const OTHER_UDID = 'OTHER-UDID-5678';
const SIMULATOR_APP_PATH =
  '/Users/test/Library/Developer/CoreSimulator/Devices/BOOTED-UDID-1234/data/Containers/Bundle/Application/ABC/MetaMask.app';

const DEBUG_BUILD_PATH =
  '/repo/ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app';
const RELEASE_BUILD_PATH =
  '/repo/ios/build/Build/Products/Release-iphonesimulator/MetaMask.app';
const DERIVED_DATA_PATH =
  '/Users/test/Library/Developer/Xcode/DerivedData/MetaMask-abc/Build/Products/Debug-iphonesimulator/MetaMask.app';

function setExecFileSyncMock(
  options: {
    devices?: { udid: string; state: string }[];
    bootedDevices?: { udid: string; state: string }[];
    derivedDataPaths?: string[];
    simulatorAppPath?: string | null;
    bundleId?: string;
    foxCode?: string | null;
    shortVersion?: string | null;
    buildVersion?: string | null;
    helpFails?: boolean;
    listDevicesFails?: boolean;
  } = {},
) {
  mockedExecFileSync.mockImplementation((file, args) => {
    const argsArr = args as string[];

    if (file === 'xcrun' && argsArr[0] === 'simctl' && argsArr[1] === 'help') {
      if (options.helpFails) {
        throw new Error('simctl not available');
      }
      return '';
    }

    if (
      file === 'xcrun' &&
      argsArr[0] === 'simctl' &&
      argsArr[1] === 'list' &&
      argsArr[2] === 'devices'
    ) {
      if (options.listDevicesFails) {
        throw new Error('list devices failed');
      }
      if (argsArr.includes('booted')) {
        return JSON.stringify({
          devices: {
            'iOS 17.0': options.bootedDevices ?? [],
          },
        });
      }
      return JSON.stringify({
        devices: {
          'iOS 17.0': options.devices ?? [],
        },
      });
    }

    if (file === 'find' && argsArr[0]?.includes('DerivedData')) {
      return (options.derivedDataPaths ?? []).join('\n');
    }

    if (
      file === 'xcrun' &&
      argsArr[0] === 'simctl' &&
      argsArr[1] === 'get_app_container'
    ) {
      if (options.simulatorAppPath) {
        return `${options.simulatorAppPath}\n`;
      }
      throw new Error('app not installed');
    }

    if (file === 'defaults' && argsArr[0] === 'read') {
      const key = argsArr[2];
      if (key === 'CFBundleIdentifier') {
        return `${options.bundleId ?? 'io.metamask.MetaMask'}\n`;
      }
      if (key === 'fox_code') {
        if (options.foxCode === null) {
          throw new Error('no fox_code');
        }
        return `${options.foxCode ?? 'PROD'}\n`;
      }
      if (key === 'CFBundleShortVersionString') {
        if (options.shortVersion === null) {
          throw new Error('no short version');
        }
        return `${options.shortVersion ?? '7.35.0'}\n`;
      }
      if (key === 'CFBundleVersion') {
        if (options.buildVersion === null) {
          throw new Error('no build version');
        }
        return `${options.buildVersion ?? '1'}\n`;
      }
      return '';
    }

    throw new Error(
      `Unexpected execFileSync call: ${file} ${argsArr.join(' ')}`,
    );
  });
}

function setExistsSyncMock(existingPaths: string[]) {
  const pathSet = new Set(existingPaths);
  mockedExistsSync.mockImplementation((filepath) =>
    pathSet.has(filepath as string),
  );
}

describe('validateIOSPrerequisites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveRepoRoot.mockReturnValue('/repo');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('device resolution', () => {
    it('auto-resolves first booted simulator when no UDID provided', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([DEBUG_BUILD_PATH]);

      const result = await validateIOSPrerequisites({ context: 'e2e' });

      expect(result.simulatorDeviceId).toBe(BOOTED_UDID);
    });

    it('validates explicitly provided UDID exists', async () => {
      setExecFileSyncMock({
        devices: [
          { udid: OTHER_UDID, state: 'Shutdown' },
          { udid: BOOTED_UDID, state: 'Booted' },
        ],
      });
      setExistsSyncMock([DEBUG_BUILD_PATH]);

      const result = await validateIOSPrerequisites({
        simulatorDeviceId: BOOTED_UDID,
        context: 'e2e',
      });

      expect(result.simulatorDeviceId).toBe(BOOTED_UDID);
    });

    it('throws MM_IOS_RUNNER_NOT_READY when no simulator is booted', async () => {
      setExecFileSyncMock({
        bootedDevices: [],
      });

      await expect(
        validateIOSPrerequisites({ context: 'e2e' }),
      ).rejects.toThrow(IOSLaunchError);
      await expect(
        validateIOSPrerequisites({ context: 'e2e' }),
      ).rejects.toMatchObject({
        code: 'MM_IOS_RUNNER_NOT_READY',
        message: 'No simulator is booted',
      });
    });

    it('throws MM_IOS_RUNNER_NOT_READY when provided UDID not found', async () => {
      setExecFileSyncMock({
        devices: [{ udid: OTHER_UDID, state: 'Shutdown' }],
      });

      await expect(
        validateIOSPrerequisites({
          simulatorDeviceId: 'NONEXISTENT',
          context: 'e2e',
        }),
      ).rejects.toThrow(IOSLaunchError);
      await expect(
        validateIOSPrerequisites({
          simulatorDeviceId: 'NONEXISTENT',
          context: 'e2e',
        }),
      ).rejects.toMatchObject({
        code: 'MM_IOS_RUNNER_NOT_READY',
        message: 'Simulator UDID NONEXISTENT not found',
      });
    });
  });

  describe('app bundle resolution search order', () => {
    it('finds Debug build first when it exists', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([DEBUG_BUILD_PATH]);

      const result = await validateIOSPrerequisites({ context: 'e2e' });

      expect(result.appBundlePath).toBe(DEBUG_BUILD_PATH);
      expect(result.appAlreadyInstalled).toBe(false);
    });

    it('falls through to Release build when Debug does not exist', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([RELEASE_BUILD_PATH]);

      const result = await validateIOSPrerequisites({ context: 'e2e' });

      expect(result.appBundlePath).toBe(RELEASE_BUILD_PATH);
      expect(result.appAlreadyInstalled).toBe(false);
    });

    it('falls through to DerivedData when Debug/Release do not exist', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        derivedDataPaths: [DERIVED_DATA_PATH],
      });
      setExistsSyncMock([DERIVED_DATA_PATH]);

      const result = await validateIOSPrerequisites({ context: 'e2e' });

      expect(result.appBundlePath).toBe(DERIVED_DATA_PATH);
      expect(result.appAlreadyInstalled).toBe(false);
    });

    it('falls through to simulator-installed app when no local builds exist', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([SIMULATOR_APP_PATH]);

      const result = await validateIOSPrerequisites({ context: 'e2e' });

      expect(result.appBundlePath).toBe(SIMULATOR_APP_PATH);
      expect(result.appAlreadyInstalled).toBe(true);
    });

    it('throws with comprehensive error when nothing found', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        derivedDataPaths: [],
      });
      setExistsSyncMock([]);

      await expect(
        validateIOSPrerequisites({ context: 'e2e' }),
      ).rejects.toThrow(IOSLaunchError);
      await expect(
        validateIOSPrerequisites({ context: 'e2e' }),
      ).rejects.toMatchObject({
        code: 'MM_IOS_RUNNER_NOT_READY',
        message: expect.stringContaining(BOOTED_UDID),
      });
    });
  });

  describe('appAlreadyInstalled flag', () => {
    it('returns false when app found in local build paths', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([DEBUG_BUILD_PATH]);

      const result = await validateIOSPrerequisites({ context: 'e2e' });

      expect(result.appAlreadyInstalled).toBe(false);
    });

    it('returns false when app found in DerivedData', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        derivedDataPaths: [DERIVED_DATA_PATH],
      });
      setExistsSyncMock([DERIVED_DATA_PATH]);

      const result = await validateIOSPrerequisites({ context: 'e2e' });

      expect(result.appAlreadyInstalled).toBe(false);
    });

    it('returns true when app found via simulator lookup', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([SIMULATOR_APP_PATH]);

      const result = await validateIOSPrerequisites({});

      expect(result.appAlreadyInstalled).toBe(true);
    });

    it('returns false when --app-bundle explicitly provided', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([DEBUG_BUILD_PATH]);

      const result = await validateIOSPrerequisites({
        appBundlePath: DEBUG_BUILD_PATH,
        context: 'e2e',
      });

      expect(result.appAlreadyInstalled).toBe(false);
    });
  });

  describe('explicit --app-bundle', () => {
    it('uses the provided path directly', async () => {
      const customPath = '/custom/path/MetaMask.app';
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([customPath]);

      const result = await validateIOSPrerequisites({
        appBundlePath: customPath,
        context: 'e2e',
      });

      expect(result.appBundlePath).toBe(customPath);
    });

    it('throws when provided path does not exist', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([]);

      await expect(
        validateIOSPrerequisites({
          appBundlePath: '/nonexistent/MetaMask.app',
          context: 'e2e',
        }),
      ).rejects.toThrow(IOSLaunchError);
      await expect(
        validateIOSPrerequisites({
          appBundlePath: '/nonexistent/MetaMask.app',
          context: 'e2e',
        }),
      ).rejects.toMatchObject({
        code: 'MM_IOS_RUNNER_NOT_READY',
        message: expect.stringContaining('/nonexistent/MetaMask.app'),
      });
    });
  });

  describe('error messages', () => {
    it('error mentions simulator UDID when no candidates match', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        derivedDataPaths: [],
      });
      setExistsSyncMock([]);

      await expect(
        validateIOSPrerequisites({ context: 'e2e' }),
      ).rejects.toMatchObject({
        message: expect.stringContaining(`simulator ${BOOTED_UDID}`),
      });
    });

    it('error shows specific path when explicit --app-bundle fails', async () => {
      const customPath = '/explicit/MetaMask.app';
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([]);

      await expect(
        validateIOSPrerequisites({ appBundlePath: customPath, context: 'e2e' }),
      ).rejects.toMatchObject({
        message: expect.stringContaining(customPath),
      });
    });
  });
});

describe('readAppBundleMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('reads all metadata fields from a valid .app bundle', () => {
    setExecFileSyncMock({
      bundleId: 'io.metamask.MetaMask',
      foxCode: 'DEV',
      shortVersion: '7.35.0',
      buildVersion: '123',
    });

    const result = readAppBundleMetadata('/tmp/MetaMask.app');

    expect(result).toStrictEqual({
      appBundlePath: '/tmp/MetaMask.app',
      bundleId: 'io.metamask.MetaMask',
      foxCode: 'DEV',
      shortVersion: '7.35.0',
      buildVersion: '123',
    });
  });

  it('returns null for missing fox_code', () => {
    setExecFileSyncMock({
      bundleId: 'io.metamask.MetaMask',
      foxCode: null,
      shortVersion: '7.35.0',
      buildVersion: '1',
    });

    const result = readAppBundleMetadata('/tmp/MetaMask.app');

    expect(result.foxCode).toBeNull();
    expect(result.bundleId).toBe('io.metamask.MetaMask');
    expect(result.shortVersion).toBe('7.35.0');
    expect(result.buildVersion).toBe('1');
  });

  it('returns fallback bundleId when CFBundleIdentifier read fails', () => {
    mockedExecFileSync.mockImplementation((file, args) => {
      const argsArr = args as string[];
      if (
        file === 'defaults' &&
        argsArr[0] === 'read' &&
        argsArr[2] === 'CFBundleIdentifier'
      ) {
        throw new Error('read failed');
      }
      if (
        file === 'defaults' &&
        argsArr[0] === 'read' &&
        argsArr[2] === 'fox_code'
      ) {
        throw new Error('read failed');
      }
      if (file === 'defaults' && argsArr[0] === 'read') {
        return '7.35.0\n';
      }
      throw new Error(`Unexpected: ${file} ${argsArr.join(' ')}`);
    });

    const result = readAppBundleMetadata('/tmp/MetaMask.app');

    expect(result.bundleId).toBe('io.metamask.MetaMask');
    expect(result.foxCode).toBeNull();
  });

  it('returns null fields for non-existent app path', () => {
    mockedExecFileSync.mockImplementation((file, args) => {
      const argsArr = args as string[];
      if (file === 'defaults' && argsArr[0] === 'read') {
        throw new Error('read failed');
      }
      throw new Error(`Unexpected: ${file} ${argsArr.join(' ')}`);
    });

    const result = readAppBundleMetadata('/nonexistent/MetaMask.app');

    expect(result).toStrictEqual({
      appBundlePath: '/nonexistent/MetaMask.app',
      bundleId: 'io.metamask.MetaMask',
      foxCode: null,
      shortVersion: null,
      buildVersion: null,
    });
  });
});

describe('context-aware app resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveRepoRoot.mockReturnValue('/repo');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('prod context', () => {
    it('reuses installed app when no --app-bundle provided', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([SIMULATOR_APP_PATH]);

      const result = await validateIOSPrerequisites({ context: 'prod' });

      expect(result.appBundlePath).toBe(SIMULATOR_APP_PATH);
      expect(result.appAlreadyInstalled).toBe(true);
      expect(result.installAction).toBe('reuse-installed');
      expect(result.installedAppMetadata).not.toBeNull();
    });

    it('throws MM_IOS_RUNNER_NOT_READY when no installed app and no --app-bundle', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: null,
      });
      setExistsSyncMock([]);

      await expect(
        validateIOSPrerequisites({ context: 'prod' }),
      ).rejects.toMatchObject({
        code: 'MM_IOS_RUNNER_NOT_READY',
        message: expect.stringContaining('No MetaMask app installed'),
      });
    });

    it('throws MM_LAUNCH_FAILED when --reinstall without --app-bundle (installed app is only copy)', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([SIMULATOR_APP_PATH]);

      await expect(
        validateIOSPrerequisites({ context: 'prod', reinstall: true }),
      ).rejects.toMatchObject({
        code: 'MM_LAUNCH_FAILED',
        message: expect.stringContaining(
          'Cannot use --reinstall or --reset-app-data without --app-bundle',
        ),
      });
    });

    it('throws MM_LAUNCH_FAILED when --reset-app-data without --app-bundle (installed app is only copy)', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([SIMULATOR_APP_PATH]);

      await expect(
        validateIOSPrerequisites({ context: 'prod', resetAppData: true }),
      ).rejects.toMatchObject({
        code: 'MM_LAUNCH_FAILED',
        message: expect.stringContaining(
          'Cannot use --reinstall or --reset-app-data without --app-bundle',
        ),
      });
    });

    it('allows --reinstall when --app-bundle is provided', async () => {
      const explicitPath = '/explicit/MetaMask.app';
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
        foxCode: 'SAME-FC',
      });
      setExistsSyncMock([SIMULATOR_APP_PATH, explicitPath]);

      const result = await validateIOSPrerequisites({
        context: 'prod',
        appBundlePath: explicitPath,
        reinstall: true,
      });

      expect(result.installAction).toBe('reinstall');
      expect(result.appAlreadyInstalled).toBe(true);
    });

    it('--reset-app-data with --app-bundle returns reset-and-install', async () => {
      const explicitPath = '/explicit/MetaMask.app';
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
        foxCode: 'SAME-FC',
      });
      setExistsSyncMock([SIMULATOR_APP_PATH, explicitPath]);

      const result = await validateIOSPrerequisites({
        context: 'prod',
        appBundlePath: explicitPath,
        resetAppData: true,
      });

      expect(result.installAction).toBe('reset-and-install');
      expect(result.appAlreadyInstalled).toBe(true);
    });

    it('allows explicit bundle with same fox_code', async () => {
      const explicitPath = '/explicit/MetaMask.app';
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
        foxCode: 'SAME-FC',
      });
      setExistsSyncMock([SIMULATOR_APP_PATH, explicitPath]);

      const result = await validateIOSPrerequisites({
        context: 'prod',
        appBundlePath: explicitPath,
      });

      expect(result.installAction).toBe('install-explicit');
      expect(result.selectedAppMetadata.foxCode).toBe('SAME-FC');
    });

    it('throws MM_IOS_APP_IDENTITY_MISMATCH when fox_code differs', async () => {
      const explicitPath = '/explicit/MetaMask.app';
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([SIMULATOR_APP_PATH, explicitPath]);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test helper guaranteed to be set
      const baseImpl = mockedExecFileSync.getMockImplementation()!;
      mockedExecFileSync.mockImplementation((file, args) => {
        const argsArr = args as string[];
        if (file === 'defaults' && argsArr[0] === 'read') {
          const key = argsArr[2];
          const plistPath = argsArr[1];
          if (plistPath.includes('CoreSimulator')) {
            if (key === 'fox_code') return 'INSTALLED-FC\n';
            return 'io.metamask.MetaMask\n';
          }
          if (key === 'fox_code') return 'EXPLICIT-FC\n';
          return 'io.metamask.MetaMask\n';
        }
        return baseImpl(file, args);
      });

      await expect(
        validateIOSPrerequisites({
          context: 'prod',
          appBundlePath: explicitPath,
        }),
      ).rejects.toMatchObject({
        code: 'MM_IOS_APP_IDENTITY_MISMATCH',
        message: expect.stringContaining('fox_code'),
      });
    });

    it('allows fox_code mismatch with reinstall: true', async () => {
      const explicitPath = '/explicit/MetaMask.app';
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([SIMULATOR_APP_PATH, explicitPath]);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test helper guaranteed to be set
      const baseImpl = mockedExecFileSync.getMockImplementation()!;
      mockedExecFileSync.mockImplementation((file, args) => {
        const argsArr = args as string[];
        if (file === 'defaults' && argsArr[0] === 'read') {
          const key = argsArr[2];
          const plistPath = argsArr[1];
          if (plistPath.includes('CoreSimulator')) {
            if (key === 'fox_code') return 'INSTALLED-FC\n';
            return 'io.metamask.MetaMask\n';
          }
          if (key === 'fox_code') return 'EXPLICIT-FC\n';
          return 'io.metamask.MetaMask\n';
        }
        return baseImpl(file, args);
      });

      const result = await validateIOSPrerequisites({
        context: 'prod',
        appBundlePath: explicitPath,
        reinstall: true,
      });

      expect(result.installAction).toBe('reinstall');
    });

    it('allows fox_code mismatch with allowFoxCodeMismatch: true', async () => {
      const explicitPath = '/explicit/MetaMask.app';
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([SIMULATOR_APP_PATH, explicitPath]);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test helper guaranteed to be set
      const baseImpl = mockedExecFileSync.getMockImplementation()!;
      mockedExecFileSync.mockImplementation((file, args) => {
        const argsArr = args as string[];
        if (file === 'defaults' && argsArr[0] === 'read') {
          const key = argsArr[2];
          const plistPath = argsArr[1];
          if (plistPath.includes('CoreSimulator')) {
            if (key === 'fox_code') return 'INSTALLED-FC\n';
            return 'io.metamask.MetaMask\n';
          }
          if (key === 'fox_code') return 'EXPLICIT-FC\n';
          return 'io.metamask.MetaMask\n';
        }
        return baseImpl(file, args);
      });

      const result = await validateIOSPrerequisites({
        context: 'prod',
        appBundlePath: explicitPath,
        allowFoxCodeMismatch: true,
      });

      expect(result.installAction).toBe('install-explicit');
    });
  });

  describe('e2e context', () => {
    it('uses explicit app bundle directly', async () => {
      const explicitPath = '/explicit/MetaMask.app';
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([explicitPath]);

      const result = await validateIOSPrerequisites({
        context: 'e2e',
        appBundlePath: explicitPath,
      });

      expect(result.appBundlePath).toBe(explicitPath);
      expect(result.installAction).toBe('install-explicit');
    });

    it('selects local Debug build when no explicit bundle provided', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([DEBUG_BUILD_PATH]);

      const result = await validateIOSPrerequisites({ context: 'e2e' });

      expect(result.appBundlePath).toBe(DEBUG_BUILD_PATH);
      expect(result.appAlreadyInstalled).toBe(false);
      expect(result.installAction).toBe('install-new');
    });

    it('reinstall flag overrides installAction to reinstall', async () => {
      const explicitPath = '/explicit/MetaMask.app';
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([explicitPath, SIMULATOR_APP_PATH]);

      const result = await validateIOSPrerequisites({
        context: 'e2e',
        appBundlePath: explicitPath,
        reinstall: true,
      });

      expect(result.installAction).toBe('reinstall');
    });

    it('throws MM_LAUNCH_FAILED when --reset-app-data and only simulator-installed app exists', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([SIMULATOR_APP_PATH]);

      await expect(
        validateIOSPrerequisites({
          context: 'e2e',
          resetAppData: true,
        }),
      ).rejects.toMatchObject({
        code: 'MM_LAUNCH_FAILED',
        message: expect.stringContaining('only discovered app'),
      });
    });

    it('throws MM_LAUNCH_FAILED when --reinstall and only simulator-installed app exists', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
        simulatorAppPath: SIMULATOR_APP_PATH,
      });
      setExistsSyncMock([SIMULATOR_APP_PATH]);

      await expect(
        validateIOSPrerequisites({
          context: 'e2e',
          reinstall: true,
        }),
      ).rejects.toMatchObject({
        code: 'MM_LAUNCH_FAILED',
        message: expect.stringContaining('only discovered app'),
      });
    });

    it('allows --reset-app-data when a local build exists', async () => {
      setExecFileSyncMock({
        bootedDevices: [{ udid: BOOTED_UDID, state: 'Booted' }],
      });
      setExistsSyncMock([DEBUG_BUILD_PATH]);

      const result = await validateIOSPrerequisites({
        context: 'e2e',
        resetAppData: true,
      });

      expect(result.installAction).toBe('reset-and-install');
      expect(result.appBundlePath).toBe(DEBUG_BUILD_PATH);
    });
  });
});
