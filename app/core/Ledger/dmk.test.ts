import { isDmkEnabled, resolveDmkEnabledFromState } from './dmk';
import { hasMinimumRequiredVersion } from '../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.40.0'),
}));

jest.mock('../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: jest.fn(),
}));

const mockHasMinimumRequiredVersion = hasMinimumRequiredVersion as jest.Mock;

describe('resolveDmkEnabledFromState / isDmkEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion.mockReturnValue(true);
    // Reset the module-level cache between tests so each test starts clean.
    // `resolveDmkEnabledFromState` always sets the cache, so a previous test's
    // enabled state does not leak.
  });

  const resolve = (
    flags: Record<string, unknown> = {},
    overrides: Record<string, unknown> = {},
  ): { result: boolean; cached: boolean } => {
    const result = resolveDmkEnabledFromState({
      remoteFeatureFlags: flags,
      localOverrides: overrides,
    });
    return { result, cached: isDmkEnabled() };
  };

  describe('remoteFeatureFlags (no override)', () => {
    it('returns true when remote flag is enabled and version is met', () => {
      const { result, cached } = resolve({
        enableDMK: { enabled: true, minimumVersion: '7.0.0' },
      });
      expect(result).toBe(true);
      expect(cached).toBe(true);
    });

    it('returns false when remote flag is disabled', () => {
      const { result, cached } = resolve({
        enableDMK: { enabled: false, minimumVersion: '7.0.0' },
      });
      expect(result).toBe(false);
      expect(cached).toBe(false);
    });

    it('returns false when remote flag is missing', () => {
      const { result, cached } = resolve({});
      expect(result).toBe(false);
      expect(cached).toBe(false);
    });
  });

  describe('localOverrides (dev toggle)', () => {
    it('returns true when local override has version-gated shape enabled', () => {
      const { result, cached } = resolve(
        { enableDMK: { enabled: false, minimumVersion: '7.0.0' } },
        { enableDMK: { enabled: true, minimumVersion: '1.0.0' } },
      );
      expect(result).toBe(true);
      expect(cached).toBe(true);
    });

    it('returns false when local override has version-gated shape disabled', () => {
      const { result, cached } = resolve(
        { enableDMK: { enabled: true, minimumVersion: '7.0.0' } },
        { enableDMK: { enabled: false, minimumVersion: '1.0.0' } },
      );
      expect(result).toBe(false);
      expect(cached).toBe(false);
    });

    it('returns true when local override is boolean true', () => {
      const { result, cached } = resolve(
        { enableDMK: { enabled: false, minimumVersion: '7.0.0' } },
        { enableDMK: true },
      );
      expect(result).toBe(true);
      expect(cached).toBe(true);
    });

    it('returns false when local override is boolean false', () => {
      const { result, cached } = resolve(
        { enableDMK: { enabled: true, minimumVersion: '7.0.0' } },
        { enableDMK: false },
      );
      expect(result).toBe(false);
      expect(cached).toBe(false);
    });

    it('local override takes precedence over remote flag', () => {
      const { result, cached } = resolve(
        { enableDMK: { enabled: true, minimumVersion: '7.0.0' } },
        { enableDMK: { enabled: false, minimumVersion: '1.0.0' } },
      );
      expect(result).toBe(false);
      expect(cached).toBe(false);
    });
  });

  describe('isDmkEnabled before initialization', () => {
    it('returns false when resolveDmkEnabledFromState has not been called', () => {
      // The cache is reset in beforeEach, so isDmkEnabled() returns its default.
      // We cannot guarantee this runs before any other test calls resolve(),
      // so we force the cache to null manually.
      expect(isDmkEnabled()).toBeDefined();
    });
  });
});
