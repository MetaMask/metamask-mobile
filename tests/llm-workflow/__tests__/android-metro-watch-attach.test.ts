/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'node:child_process';

import {
  attachAndroidMetro,
  buildAndroidMetroDeepLink,
  cleanupAndroidMetro,
} from '../android/metro-watch-attach';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));

const mockExecFileSync = jest.mocked(execFileSync);

describe('Android Metro attachment', () => {
  let fetchImpl: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('packager-status:running'),
    } as Response);
    mockExecFileSync.mockReturnValue('');
  });

  it('builds an origin-only Android development-client URL', () => {
    const result = buildAndroidMetroDeepLink(8081);
    // The dev-client must receive the origin only; appending /index.bundle and
    // query params breaks React Native asset resolution for custom assetExts
    // (e.g. .riv), so the URL must not carry a bundle path or parameters.
    expect(result.devServerUrl).toBe('http://localhost:8081');
    expect(result.devServerUrl).not.toContain('index.bundle');
    expect(result.devServerUrl).not.toContain('platform=android');
    expect(result.deepLinkUrl).toBe(
      `expo-metamask://expo-development-client/?url=${encodeURIComponent(result.devServerUrl)}&disableOnboarding=1`,
    );
  });

  it('validates Metro before creating an absent mapping and opens the explicit activity', async () => {
    const attachment = await attachAndroidMetro(
      'emulator-5554',
      8081,
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8081/status',
      expect.anything(),
    );
    expect(attachment.ownsReverse).toBe(true);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'adb',
      ['-s', 'emulator-5554', 'reverse', '--no-rebind', 'tcp:8081', 'tcp:8081'],
      expect.anything(),
    );
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'adb',
      [
        '-s',
        'emulator-5554',
        'shell',
        'am',
        'start',
        '-W',
        '-a',
        'android.intent.action.VIEW',
        '-d',
        "'expo-metamask://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081&disableOnboarding=1'",
        '-n',
        'io.metamask/io.metamask.MainActivity',
      ],
      expect.anything(),
    );
  });

  it('reuses an identical mapping without ownership', async () => {
    mockExecFileSync.mockImplementation((_file, args) =>
      (args as string[]).includes('--list')
        ? 'host-16 tcp:8081 tcp:8081\n'
        : '',
    );

    const attachment = await attachAndroidMetro(
      'emulator-5554',
      8081,
      fetchImpl,
    );

    expect(attachment.ownsReverse).toBe(false);
    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      'adb',
      ['-s', 'emulator-5554', 'reverse', '--no-rebind', 'tcp:8081', 'tcp:8081'],
      expect.anything(),
    );
  });

  it('rejects a conflicting mapping without overwriting it', async () => {
    mockExecFileSync.mockImplementation((_file, args) =>
      (args as string[]).includes('--list') ? 'tcp:8081 tcp:9090\n' : '',
    );

    await expect(
      attachAndroidMetro('emulator-5554', 8081, fetchImpl),
    ).rejects.toMatchObject({ code: 'MM_DEVICE_NOT_AVAILABLE' });
    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      'adb',
      ['-s', 'emulator-5554', 'reverse', '--no-rebind', 'tcp:8081', 'tcp:8081'],
      expect.anything(),
    );
  });

  it('does not mutate reverse mappings when Metro is unavailable', async () => {
    fetchImpl.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: () => Promise.resolve('packager-status:running'),
    } as Response);

    await expect(
      attachAndroidMetro('emulator-5554', 8081, fetchImpl),
    ).rejects.toMatchObject({
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message: expect.stringContaining('Remediation: Run `yarn watch:clean`'),
    });
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it.each(['not-metro', ''])(
    'rejects HTTP 200 with unrecognized Metro status body %j before ADB mutation',
    async (statusBody) => {
      fetchImpl.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(statusBody),
      } as Response);

      await expect(
        attachAndroidMetro('emulator-5554', 8081, fetchImpl),
      ).rejects.toMatchObject({ code: 'MM_DEVICE_NOT_AVAILABLE' });
      expect(mockExecFileSync).not.toHaveBeenCalled();
    },
  );

  it('signals immediately before opening the deep link', async () => {
    const onBeforeOpenApp = jest.fn();

    await attachAndroidMetro('emulator-5554', 8081, fetchImpl, onBeforeOpenApp);

    expect(onBeforeOpenApp).toHaveBeenCalledTimes(1);
    expect(onBeforeOpenApp.mock.invocationCallOrder[0]).toBeLessThan(
      mockExecFileSync.mock.invocationCallOrder.at(-1) ?? 0,
    );
  });

  it('removes an owned mapping only while it still matches', () => {
    mockExecFileSync.mockReturnValue('host-16 tcp:8081 tcp:8081\n');

    cleanupAndroidMetro({
      serial: 'emulator-5554',
      metroPort: 8081,
      ownsReverse: true,
    });

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'adb',
      ['-s', 'emulator-5554', 'reverse', '--remove', 'tcp:8081'],
      expect.anything(),
    );
  });

  it('preserves an owned mapping whose target changed', () => {
    mockExecFileSync.mockReturnValue('host-16 tcp:8081 tcp:9090\n');

    cleanupAndroidMetro({
      serial: 'emulator-5554',
      metroPort: 8081,
      ownsReverse: true,
    });

    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      'adb',
      expect.arrayContaining(['--remove']),
      expect.anything(),
    );
  });

  it('cleans an owned mapping when deep-link launch fails', async () => {
    let listCount = 0;
    mockExecFileSync.mockImplementation((_file, args) => {
      const command = (args as string[]).join(' ');
      if (command.includes('reverse --list')) {
        listCount += 1;
        return listCount === 1 ? '' : 'host-16 tcp:8081 tcp:8081\n';
      }
      if (command.includes('shell am start'))
        throw new Error('deep link failed');
      return '';
    });

    await expect(
      attachAndroidMetro('emulator-5554', 8081, fetchImpl),
    ).rejects.toThrow('deep link failed');
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'adb',
      ['-s', 'emulator-5554', 'reverse', '--remove', 'tcp:8081'],
      expect.anything(),
    );
  });

  it('reuses an identical mapping created concurrently after the no-rebind create is rejected', async () => {
    let listCount = 0;
    mockExecFileSync.mockImplementation((_file, args) => {
      const command = (args as string[]).join(' ');
      if (command.includes('reverse --list')) {
        listCount += 1;
        return listCount === 1 ? '' : 'host-16 tcp:8081 tcp:8081\n';
      }
      if (command.includes('--no-rebind')) {
        throw new Error('cannot rebind existing socket');
      }
      return '';
    });

    const attachment = await attachAndroidMetro(
      'emulator-5554',
      8081,
      fetchImpl,
    );

    expect(attachment.ownsReverse).toBe(false);
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'adb',
      expect.arrayContaining(['shell', 'am', 'start']),
      expect.anything(),
    );
  });

  it('throws conflict when a different mapping appears after the no-rebind create is rejected', async () => {
    let listCount = 0;
    mockExecFileSync.mockImplementation((_file, args) => {
      const command = (args as string[]).join(' ');
      if (command.includes('reverse --list')) {
        listCount += 1;
        return listCount === 1 ? '' : 'host-16 tcp:8081 tcp:9090\n';
      }
      if (command.includes('--no-rebind')) {
        throw new Error('cannot rebind existing socket');
      }
      return '';
    });

    await expect(
      attachAndroidMetro('emulator-5554', 8081, fetchImpl),
    ).rejects.toMatchObject({ code: 'MM_DEVICE_NOT_AVAILABLE' });
    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      'adb',
      expect.arrayContaining(['shell', 'am', 'start']),
      expect.anything(),
    );
  });

  it('propagates the create error when the port is still unmapped after a no-rebind failure', async () => {
    mockExecFileSync.mockImplementation((_file, args) => {
      const command = (args as string[]).join(' ');
      if (command.includes('reverse --list')) {
        return '';
      }
      if (command.includes('--no-rebind')) {
        throw new Error('adb: device offline');
      }
      return '';
    });

    await expect(
      attachAndroidMetro('emulator-5554', 8081, fetchImpl),
    ).rejects.toThrow('device offline');
    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      'adb',
      expect.arrayContaining(['shell', 'am', 'start']),
      expect.anything(),
    );
  });
});
