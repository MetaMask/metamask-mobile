import {
  selectHubPageDiscoveryTabsABTest,
  selectOnboardingChecklistStepperAbTest,
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

  describe('selectOnboardingChecklistStepperAbTest', () => {
    it('returns treatment assignment when flag is set to treatment', () => {
      const result = selectOnboardingChecklistStepperAbTest.resultFunc({
        homeTMCU828AbtestOnboardingChecklistStepper: 'treatment',
      });
      expect(result).toEqual({ variantName: 'treatment', isActive: true });
    });

    it('returns control assignment when flag is set to control', () => {
      const result = selectOnboardingChecklistStepperAbTest.resultFunc({
        homeTMCU828AbtestOnboardingChecklistStepper: 'control',
      });
      expect(result).toEqual({ variantName: 'control', isActive: true });
    });

    it('falls back to control and isActive false when flag is missing', () => {
      const result = selectOnboardingChecklistStepperAbTest.resultFunc({});
      expect(result).toEqual({ variantName: 'control', isActive: false });
    });

    it('falls back to control and isActive false when flag value is invalid', () => {
      const result = selectOnboardingChecklistStepperAbTest.resultFunc({
        homeTMCU828AbtestOnboardingChecklistStepper: 'unknown_variant',
      });
      expect(result).toEqual({ variantName: 'control', isActive: false });
    });
  });
});
