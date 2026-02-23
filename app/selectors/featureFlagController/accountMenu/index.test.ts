import { selectAccountMenuEnabled } from '.';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('Account Menu Feature Flag Selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  describe('selectAccountMenuEnabled', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectAccountMenuEnabled.resultFunc({
        mobileUxAccountMenu: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectAccountMenuEnabled.resultFunc({
        mobileUxAccountMenu: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);
      const result = selectAccountMenuEnabled.resultFunc({
        mobileUxAccountMenu: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectAccountMenuEnabled.resultFunc({
        mobileUxAccountMenu: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });
      expect(result).toBe(false);
    });

    it('returns true when remote flag is a plain boolean true', () => {
      const result = selectAccountMenuEnabled.resultFunc({
        mobileUxAccountMenu: true,
      });
      expect(result).toBe(true);
    });

    it('returns false when remote flag is a plain boolean false', () => {
      const result = selectAccountMenuEnabled.resultFunc({
        mobileUxAccountMenu: false,
      });
      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectAccountMenuEnabled.resultFunc({});
      expect(result).toBe(false);
    });

    it('returns false when mobileUxAccountMenu flag is missing', () => {
      const result = selectAccountMenuEnabled.resultFunc({
        someOtherFlag: true,
      });
      expect(result).toBe(false);
    });
  });
});
