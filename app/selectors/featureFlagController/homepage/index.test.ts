import {
  selectHomepageSectionsV1Enabled,
  selectHubPageDiscoveryTabsABTest,
} from '.';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('Homepage Feature Flag Selectors', () => {
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

  describe('selectHomepageSectionsV1Enabled', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectHomepageSectionsV1Enabled.resultFunc({
        homepageSectionsV1: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectHomepageSectionsV1Enabled.resultFunc({
        homepageSectionsV1: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);
      const result = selectHomepageSectionsV1Enabled.resultFunc({
        homepageSectionsV1: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectHomepageSectionsV1Enabled.resultFunc({
        homepageSectionsV1: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectHomepageSectionsV1Enabled.resultFunc({});
      expect(result).toBe(false);
    });
  });

  describe('selectHubPageDiscoveryTabsABTest', () => {
    it('returns treatment assignment when flag is set to treatment string', () => {
      const result = selectHubPageDiscoveryTabsABTest.resultFunc({
        coreMCU589AbtestHubPageDiscoveryTabs: 'treatment',
      });
      expect(result).toEqual({ variantName: 'treatment', isActive: true });
    });

    it('returns control assignment when flag is set to control string', () => {
      const result = selectHubPageDiscoveryTabsABTest.resultFunc({
        coreMCU589AbtestHubPageDiscoveryTabs: 'control',
      });
      expect(result).toEqual({ variantName: 'control', isActive: true });
    });

    it('resolves controller object format ({ name }) for treatment', () => {
      const result = selectHubPageDiscoveryTabsABTest.resultFunc({
        coreMCU589AbtestHubPageDiscoveryTabs: { name: 'treatment' },
      });
      expect(result).toEqual({ variantName: 'treatment', isActive: true });
    });

    it('falls back to control and isActive false when flag is missing', () => {
      const result = selectHubPageDiscoveryTabsABTest.resultFunc({});
      expect(result).toEqual({ variantName: 'control', isActive: false });
    });

    it('falls back to control and isActive false when flag value is invalid', () => {
      const result = selectHubPageDiscoveryTabsABTest.resultFunc({
        coreMCU589AbtestHubPageDiscoveryTabs: 'unknown_variant',
      });
      expect(result).toEqual({ variantName: 'control', isActive: false });
    });
  });
});
