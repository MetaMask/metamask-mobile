import { selectHomepageRedesignV1Enabled } from '.';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('Rewards Feature Flag Selectors', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion?.mockRestore();
  });

  describe('selectHomepageRedesignV1Enabled', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectHomepageRedesignV1Enabled.resultFunc({
        homepageRedesignV1: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectHomepageRedesignV1Enabled.resultFunc({
        homepageRedesignV1: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);
      const result = selectHomepageRedesignV1Enabled.resultFunc({
        homepageRedesignV1: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectHomepageRedesignV1Enabled.resultFunc({
        homepageRedesignV1: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectHomepageRedesignV1Enabled.resultFunc({});
      expect(result).toBe(false);
    });
  });
});
