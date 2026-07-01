jest.mock('./services/device-commands/commandRunner', () => ({
  runDeviceCommand: jest.fn(),
}));

import type { CurrentDeviceDetails } from './fixtures/playwright/types';
import {
  getDeviceLocale,
  normalizeLocale,
  parseAppleLanguagesOutput,
} from './DeviceLocale';
import { runDeviceCommand } from './services/device-commands/commandRunner';

const runDeviceCommandMock = runDeviceCommand as jest.MockedFunction<
  typeof runDeviceCommand
>;

function iosDevice(
  overrides: Partial<CurrentDeviceDetails> = {},
): CurrentDeviceDetails {
  return {
    platform: 'ios',
    deviceName: 'iPhone 15',
    udid: 'SIM-UDID',
    appId: 'io.metamask',
    isBrowserstack: false,
    ...overrides,
  };
}

function androidDevice(
  overrides: Partial<CurrentDeviceDetails> = {},
): CurrentDeviceDetails {
  return {
    platform: 'android',
    deviceName: 'Pixel_5',
    udid: 'emulator-5554',
    packageName: 'io.metamask',
    launchableActivity: 'io.metamask.MainActivity',
    isBrowserstack: false,
    ...overrides,
  };
}

describe('DeviceLocale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeLocale', () => {
    it('replaces underscores with hyphens', () => {
      expect(normalizeLocale('en_US')).toBe('en-US');
    });
  });

  describe('parseAppleLanguagesOutput', () => {
    it('parses plist array output', () => {
      expect(parseAppleLanguagesOutput('(\n    "en-GB",\n    "en"\n)\n')).toBe(
        'en-GB',
      );
    });

    it('parses a single locale line', () => {
      expect(parseAppleLanguagesOutput('en-US\n')).toBe('en-US');
    });
  });

  describe('getDeviceLocale', () => {
    it('reads iOS simulator AppleLanguages', async () => {
      runDeviceCommandMock.mockResolvedValueOnce({
        stdout: '(\n    "en-GB"\n)\n',
        stderr: '',
      });

      await expect(getDeviceLocale(iosDevice())).resolves.toBe('en-GB');
      expect(runDeviceCommandMock).toHaveBeenCalledWith('xcrun', [
        'simctl',
        'spawn',
        'SIM-UDID',
        'defaults',
        'read',
        'NSGlobalDomain',
        'AppleLanguages',
      ]);
    });

    it('reads Android system_locales', async () => {
      runDeviceCommandMock.mockResolvedValueOnce({
        stdout: 'en-US\n',
        stderr: '',
      });

      await expect(getDeviceLocale(androidDevice())).resolves.toBe('en-US');
      expect(runDeviceCommandMock).toHaveBeenCalledWith('adb', [
        '-s',
        'emulator-5554',
        'shell',
        'settings',
        'get',
        'system',
        'system_locales',
      ]);
    });

    it('falls back to Android persist.sys.locale', async () => {
      runDeviceCommandMock
        .mockResolvedValueOnce({ stdout: 'null\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'en_US\n', stderr: '' });

      await expect(getDeviceLocale(androidDevice())).resolves.toBe('en-US');
    });

    it('falls back to Android ro.product.locale', async () => {
      runDeviceCommandMock
        .mockResolvedValueOnce({ stdout: 'null\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: '\n', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'en-US\n', stderr: '' });

      await expect(getDeviceLocale(androidDevice())).resolves.toBe('en-US');
    });
  });
});
