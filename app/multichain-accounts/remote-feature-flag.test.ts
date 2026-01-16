import {
  isMultichainAccountsRemoteFeatureEnabled,
  STATE_2_FLAG,
  MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
} from './remote-feature-flag';

describe('isMultichainAccountsRemoteFeatureEnabled', () => {
  it('returns true regardless of input parameters', () => {
    const result = isMultichainAccountsRemoteFeatureEnabled({}, [
      {
        version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
        featureKey: STATE_2_FLAG,
      },
    ]);

    expect(result).toBe(true);
  });
});
