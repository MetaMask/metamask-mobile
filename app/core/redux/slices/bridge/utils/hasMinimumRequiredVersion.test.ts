import { getVersion } from 'react-native-device-info';
import { hasMinimumRequiredVersion } from './hasMinimumRequiredVersion';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

describe('hasMinimumRequiredVersion', () => {
  const mockGetVersion = getVersion as jest.MockedFunction<typeof getVersion>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the env var is set to true', () => {
    it('returns true when the version is greater than the required version', () => {
      mockGetVersion.mockReturnValue('2.0.0');
      expect(hasMinimumRequiredVersion('1.0.0', true)).toBe(true);
    });

    it('returns false when the version is less than the required version', () => {
      mockGetVersion.mockReturnValue('1.0.0');
      expect(hasMinimumRequiredVersion('2.0.0', true)).toBe(false);
    });
  });

  describe('when the env var is set to false', () => {
    it('returns false', () => {
      mockGetVersion.mockReturnValue('1.0.0');
      expect(hasMinimumRequiredVersion('1.0.0', false)).toBe(false);
    });
  });
});
