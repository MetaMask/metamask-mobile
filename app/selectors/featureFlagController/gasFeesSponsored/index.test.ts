import { getGasFeesSponsoredNetworkEnabled } from './index';

describe('getGasFeesSponsoredNetworkEnabled selector', () => {
  it('returns true for chain IDs enabled in gasFeesSponsoredNetwork map', () => {
    const remoteFeatureFlags = {
      gasFeesSponsoredNetwork: {
        '0x38': true, // BNB
        '0xa4b1': false, // Arbitrum
      },
    };

    const selectorFn =
      getGasFeesSponsoredNetworkEnabled.resultFunc(remoteFeatureFlags);

    expect(selectorFn('0x38')).toBe(true);
    expect(selectorFn('0xa4b1')).toBe(false);
  });

  it('returns false for chain IDs not present in the map', () => {
    const remoteFeatureFlags = {
      gasFeesSponsoredNetwork: {
        '0x38': true,
      },
    };

    const selectorFn =
      getGasFeesSponsoredNetworkEnabled.resultFunc(remoteFeatureFlags);

    expect(selectorFn('0x1')).toBe(false);
  });
});
