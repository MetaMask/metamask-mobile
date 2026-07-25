import { selectCrossmintMemecoinCheckoutEnabled } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import {
  CROSSMINT_MEMECOIN_CHECKOUT_MINIMUM_VERSION,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import { getVersion } from 'react-native-device-info';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('Crossmint memecoin checkout feature flag selector', () => {
  const originalEnv = process.env.MM_CROSSMINT_MEMECOIN_CHECKOUT_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MM_CROSSMINT_MEMECOIN_CHECKOUT_ENABLED;
    (getVersion as jest.MockedFunction<typeof getVersion>).mockReturnValue(
      CROSSMINT_MEMECOIN_CHECKOUT_MINIMUM_VERSION,
    );
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.MM_CROSSMINT_MEMECOIN_CHECKOUT_ENABLED;
    } else {
      process.env.MM_CROSSMINT_MEMECOIN_CHECKOUT_ENABLED = originalEnv;
    }
  });

  it('returns true when enabled and minimum version requirement passes', () => {
    const result = selectCrossmintMemecoinCheckoutEnabled.resultFunc({
      [FeatureFlagNames.crossmintMemecoinCheckout]: {
        enabled: true,
        minimumVersion: CROSSMINT_MEMECOIN_CHECKOUT_MINIMUM_VERSION,
      },
    });

    expect(result).toBe(true);
  });

  it('returns false when enabled but minimum version requirement fails', () => {
    (getVersion as jest.MockedFunction<typeof getVersion>).mockReturnValue(
      '1.0.0',
    );

    const result = selectCrossmintMemecoinCheckoutEnabled.resultFunc({
      [FeatureFlagNames.crossmintMemecoinCheckout]: {
        enabled: true,
        minimumVersion: '99.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when remote flag is missing', () => {
    const result = selectCrossmintMemecoinCheckoutEnabled.resultFunc({});
    expect(result).toBe(false);
  });

  it('supports boolean dev-tool overrides when true', () => {
    const result = selectCrossmintMemecoinCheckoutEnabled.resultFunc({
      [FeatureFlagNames.crossmintMemecoinCheckout]: true,
    });

    expect(result).toBe(true);
  });
});
