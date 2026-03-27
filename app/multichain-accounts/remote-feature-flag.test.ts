import { isMultichainAccountsRemoteFeatureEnabled } from './remote-feature-flag';

describe('Multichain Accounts Feature Flag', () => {
  describe('isMultichainAccountsRemoteFeatureEnabled', () => {
    it('always returns true regardless of flags or versions', () => {
      expect(
        isMultichainAccountsRemoteFeatureEnabled({}, [
          {
            version: '*',
            featureKey: '*',
          },
        ]),
      ).toBe(true);
    });
  });
});
