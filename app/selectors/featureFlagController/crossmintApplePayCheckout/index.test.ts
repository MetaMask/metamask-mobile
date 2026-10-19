import { selectCrossmintApplePayCheckoutEnabled } from './index';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('selectCrossmintApplePayCheckoutEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('returns true when the boolean flag is enabled', () => {
    const result = selectCrossmintApplePayCheckoutEnabled.resultFunc({
      [FeatureFlagNames.crossmintApplePayCheckout]: true,
    });

    expect(result).toBe(true);
  });

  it('returns false when the boolean flag is disabled', () => {
    const result = selectCrossmintApplePayCheckoutEnabled.resultFunc({
      [FeatureFlagNames.crossmintApplePayCheckout]: false,
    });

    expect(result).toBe(false);
  });

  it('returns true when the version-gated flag is valid and enabled', () => {
    const result = selectCrossmintApplePayCheckoutEnabled.resultFunc({
      [FeatureFlagNames.crossmintApplePayCheckout]: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(true);
  });

  it('returns false when the version-gated flag is disabled', () => {
    const result = selectCrossmintApplePayCheckoutEnabled.resultFunc({
      [FeatureFlagNames.crossmintApplePayCheckout]: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when the version check fails', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);

    const result = selectCrossmintApplePayCheckoutEnabled.resultFunc({
      [FeatureFlagNames.crossmintApplePayCheckout]: {
        enabled: true,
        minimumVersion: '99.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when the flag is absent', () => {
    const result = selectCrossmintApplePayCheckoutEnabled.resultFunc({});

    expect(result).toBe(false);
  });

  it('returns false when the flag shape is invalid', () => {
    const result = selectCrossmintApplePayCheckoutEnabled.resultFunc({
      [FeatureFlagNames.crossmintApplePayCheckout]: {
        enabled: 'yes',
      } as never,
    });

    expect(result).toBe(false);
  });
});
