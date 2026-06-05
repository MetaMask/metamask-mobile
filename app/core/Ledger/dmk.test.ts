import { isDmkEnabled } from './dmk';
import { hasMinimumRequiredVersion } from '../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.40.0'),
}));

jest.mock('../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: jest.fn(),
}));

const mockHasMinimumRequiredVersion = hasMinimumRequiredVersion as jest.Mock;

const makeMessenger = (state: {
  remoteFeatureFlags?: Record<string, unknown>;
  localOverrides?: Record<string, unknown>;
}) =>
  ({
    call: jest.fn().mockReturnValue(state),
  }) as Parameters<typeof isDmkEnabled>[0];

describe('isDmkEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  describe('remoteFeatureFlags (no override)', () => {
    it('returns true when remote flag is enabled and version is met', () => {
      const messenger = makeMessenger({
        remoteFeatureFlags: {
          enableDMK: { enabled: true, minimumVersion: '7.0.0' },
        },
      });
      expect(isDmkEnabled(messenger)).toBe(true);
    });

    it('returns false when remote flag is disabled', () => {
      const messenger = makeMessenger({
        remoteFeatureFlags: {
          enableDMK: { enabled: false, minimumVersion: '7.0.0' },
        },
      });
      expect(isDmkEnabled(messenger)).toBe(false);
    });

    it('returns false when remote flag is missing', () => {
      const messenger = makeMessenger({
        remoteFeatureFlags: {},
      });
      expect(isDmkEnabled(messenger)).toBe(false);
    });
  });

  describe('localOverrides (dev toggle)', () => {
    it('returns true when local override has version-gated shape enabled', () => {
      const messenger = makeMessenger({
        remoteFeatureFlags: {
          enableDMK: { enabled: false, minimumVersion: '7.0.0' },
        },
        localOverrides: {
          enableDMK: { enabled: true, minimumVersion: '1.0.0' },
        },
      });
      expect(isDmkEnabled(messenger)).toBe(true);
    });

    it('returns false when local override has version-gated shape disabled', () => {
      const messenger = makeMessenger({
        remoteFeatureFlags: {
          enableDMK: { enabled: true, minimumVersion: '7.0.0' },
        },
        localOverrides: {
          enableDMK: { enabled: false, minimumVersion: '1.0.0' },
        },
      });
      expect(isDmkEnabled(messenger)).toBe(false);
    });

    it('returns true when local override is boolean true', () => {
      const messenger = makeMessenger({
        remoteFeatureFlags: {
          enableDMK: { enabled: false, minimumVersion: '7.0.0' },
        },
        localOverrides: {
          enableDMK: true,
        },
      });
      expect(isDmkEnabled(messenger)).toBe(true);
    });

    it('returns false when local override is boolean false', () => {
      const messenger = makeMessenger({
        remoteFeatureFlags: {
          enableDMK: { enabled: true, minimumVersion: '7.0.0' },
        },
        localOverrides: {
          enableDMK: false,
        },
      });
      expect(isDmkEnabled(messenger)).toBe(false);
    });

    it('local override takes precedence over remote flag', () => {
      const messenger = makeMessenger({
        remoteFeatureFlags: {
          enableDMK: { enabled: true, minimumVersion: '7.0.0' },
        },
        localOverrides: {
          enableDMK: { enabled: false, minimumVersion: '1.0.0' },
        },
      });
      expect(isDmkEnabled(messenger)).toBe(false);
    });
  });
});
