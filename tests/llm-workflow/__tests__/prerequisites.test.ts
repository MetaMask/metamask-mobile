/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  readAppBundleMetadata,
  validateIOSPrerequisites,
} from '../ios/prerequisites';
import { IOSLaunchError } from '../launcher-types';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));
jest.mock('node:fs', () => ({ existsSync: jest.fn() }));
jest.mock('../resolve-repo-root', () => ({
  resolveRepoRoot: jest.fn(() => '/repo'),
}));

const mockedExecFileSync = jest.mocked(execFileSync);
const mockedExistsSync = jest.mocked(existsSync);
const UDID = 'BOOTED-UDID';
const INSTALLED_APP = '/simulator/MetaMask.app';

function mockSystem(
  options: {
    installedApp?: string;
    installedFoxCode?: string;
    explicitFoxCode?: string;
  } = {},
): void {
  mockedExistsSync.mockImplementation((candidate) =>
    [options.installedApp, '/repo/explicit/MetaMask.app'].includes(
      candidate as string,
    ),
  );
  mockedExecFileSync.mockImplementation((file, args) => {
    const values = args as string[];
    if (typeof file === 'string' && file.endsWith('idb')) return '';
    if (file === 'xcrun' && values[1] === 'help') return '';
    if (file === 'xcrun' && values[1] === 'list') {
      return JSON.stringify({
        devices: { 'iOS 17': [{ udid: UDID, state: 'Booted' }] },
      });
    }
    if (file === 'xcrun' && values[1] === 'get_app_container') {
      if (options.installedApp) return `${options.installedApp}\n`;
      throw new Error('not installed');
    }
    if (file === 'defaults' && values[0] === 'read') {
      const isInstalled = values[1].includes('/simulator/');
      switch (values[2]) {
        case 'CFBundleIdentifier':
          return 'io.metamask.MetaMask\n';
        case 'fox_code':
          return `${isInstalled ? (options.installedFoxCode ?? 'PROD') : (options.explicitFoxCode ?? 'PROD')}\n`;
        case 'CFBundleShortVersionString':
          return '7.35.0\n';
        case 'CFBundleVersion':
          return '1\n';
        default:
          return '';
      }
    }
    throw new Error(`Unexpected command: ${file} ${values.join(' ')}`);
  });
}

describe('validateIOSPrerequisites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses an installed app first without searching local build outputs', async () => {
    mockSystem({ installedApp: INSTALLED_APP });

    const result = await validateIOSPrerequisites({});

    expect(result.appBundlePath).toBe(INSTALLED_APP);
    expect(result.installAction).toBe('reuse-installed');
    expect(mockedExecFileSync).not.toHaveBeenCalledWith(
      'find',
      expect.anything(),
      expect.anything(),
    );
  });

  it('requires an installed app or explicit app bundle', async () => {
    mockSystem();

    await expect(validateIOSPrerequisites({})).rejects.toMatchObject({
      code: 'MM_IOS_RUNNER_NOT_READY',
      message: expect.stringContaining('No MetaMask app installed'),
    });
  });

  it('installs an explicit bundle when no app is installed', async () => {
    mockSystem();

    const result = await validateIOSPrerequisites({
      appBundlePath: 'explicit/MetaMask.app',
    });

    expect(result.appBundlePath).toBe('/repo/explicit/MetaMask.app');
    expect(result.installAction).toBe('install-new');
  });

  it('blocks destructive actions when the installed app is the only copy', async () => {
    mockSystem({ installedApp: INSTALLED_APP });

    await expect(
      validateIOSPrerequisites({ reinstall: true }),
    ).rejects.toMatchObject({
      code: 'MM_LAUNCH_FAILED',
      remediation: expect.not.stringContaining('e2e'),
    });
  });

  it('blocks mismatched fox_code for an explicit replacement', async () => {
    mockSystem({
      installedApp: INSTALLED_APP,
      installedFoxCode: 'INSTALLED',
      explicitFoxCode: 'EXPLICIT',
    });

    await expect(
      validateIOSPrerequisites({ appBundlePath: 'explicit/MetaMask.app' }),
    ).rejects.toMatchObject({
      code: 'MM_IOS_APP_IDENTITY_MISMATCH',
    });
  });

  it('allows explicit destructive replacement when requested', async () => {
    mockSystem({ installedApp: INSTALLED_APP });

    const result = await validateIOSPrerequisites({
      appBundlePath: 'explicit/MetaMask.app',
      resetAppData: true,
    });

    expect(result.installAction).toBe('reset-and-install');
  });

  it('fails fast when idb is not installed', async () => {
    mockSystem({ installedApp: INSTALLED_APP });
    mockedExecFileSync.mockImplementation((file, args) => {
      const values = args as string[];
      if (typeof file === 'string' && file.endsWith('idb')) {
        const error = new Error('spawn ENOENT') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      if (file === 'xcrun' && values[1] === 'help') return '';
      throw new Error(`Unexpected command: ${String(file)}`);
    });

    await expect(validateIOSPrerequisites({})).rejects.toMatchObject({
      code: 'MM_IOS_DEPENDENCY_MISSING',
      remediation: expect.stringContaining('idb-companion'),
    });
  });

  it('rejects an unavailable simulator', async () => {
    mockSystem();
    mockedExecFileSync.mockImplementation((file, args) => {
      const values = args as string[];
      if (typeof file === 'string' && file.endsWith('idb')) return '';
      if (file === 'xcrun' && values[1] === 'help') return '';
      if (file === 'xcrun' && values[1] === 'list') {
        return JSON.stringify({ devices: {} });
      }
      throw new Error('unexpected');
    });

    await expect(validateIOSPrerequisites({})).rejects.toMatchObject({
      code: 'MM_IOS_RUNNER_NOT_READY',
    });
  });
});

describe('readAppBundleMetadata', () => {
  it('reads app identity metadata', () => {
    mockSystem();

    expect(readAppBundleMetadata('/repo/explicit/MetaMask.app')).toEqual({
      appBundlePath: '/repo/explicit/MetaMask.app',
      bundleId: 'io.metamask.MetaMask',
      foxCode: 'PROD',
      shortVersion: '7.35.0',
      buildVersion: '1',
    });
  });
});
