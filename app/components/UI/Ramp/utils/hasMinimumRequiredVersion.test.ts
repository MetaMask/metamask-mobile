import { getVersion } from 'react-native-device-info';
import { hasMinimumRequiredVersion } from './hasMinimumRequiredVersion';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

describe('hasMinimumRequiredVersion', () => {
  const mockGetVersion = jest.mocked(getVersion);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when feature is enabled', () => {
    it('returns true when current version exceeds minimum version', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const result = hasMinimumRequiredVersion('7.63.0', true);

      expect(result).toBe(true);
    });

    it('returns true when current version equals minimum version', () => {
      mockGetVersion.mockReturnValue('7.63.0');

      const result = hasMinimumRequiredVersion('7.63.0', true);

      expect(result).toBe(true);
    });

    it('returns false when current version is below minimum version', () => {
      mockGetVersion.mockReturnValue('7.0.0');

      const result = hasMinimumRequiredVersion('7.63.0', true);

      expect(result).toBe(false);
    });

    it('returns false when minimum version is null', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const result = hasMinimumRequiredVersion(null, true);

      expect(result).toBe(false);
    });

    it('returns false when minimum version is undefined', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const result = hasMinimumRequiredVersion(undefined, true);

      expect(result).toBe(false);
    });

    it('returns false when minimum version is empty string', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const result = hasMinimumRequiredVersion('', true);

      expect(result).toBe(false);
    });
  });

  describe('when feature is disabled', () => {
    it('returns false even when version meets requirement', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const result = hasMinimumRequiredVersion('7.63.0', false);

      expect(result).toBe(false);
    });

    it('returns false when minimum version is null', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const result = hasMinimumRequiredVersion(null, false);

      expect(result).toBe(false);
    });
  });

  describe('version comparison edge cases', () => {
    it('returns true when patch version exceeds minimum version', () => {
      mockGetVersion.mockReturnValue('7.63.1');

      const result = hasMinimumRequiredVersion('7.63.0', true);

      expect(result).toBe(true);
    });

    it('returns true when minor version exceeds minimum version', () => {
      mockGetVersion.mockReturnValue('7.64.0');

      const result = hasMinimumRequiredVersion('7.63.0', true);

      expect(result).toBe(true);
    });

    it('returns true when major version exceeds minimum version', () => {
      mockGetVersion.mockReturnValue('8.0.0');

      const result = hasMinimumRequiredVersion('7.63.0', true);

      expect(result).toBe(true);
    });
  });
});
