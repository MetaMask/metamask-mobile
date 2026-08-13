import FixtureBuilder from './FixtureBuilder';

describe('FixtureBuilder', () => {
  describe('build()', () => {
    it('omits stellarAccounts from remote feature flags by default', () => {
      const fixture = new FixtureBuilder().build();

      expect(
        fixture.state.engine.backgroundState.RemoteFeatureFlagController
          .remoteFeatureFlags,
      ).not.toHaveProperty('stellarAccounts');
    });
  });

  describe('withStellarEnabled()', () => {
    it('enables stellarAccounts, Stellar networks, and suppresses multichain intro modal', () => {
      const fixture = new FixtureBuilder().withStellarEnabled().build();

      expect(
        fixture.state.engine.backgroundState.RemoteFeatureFlagController
          .remoteFeatureFlags.stellarAccounts,
      ).toStrictEqual({
        enabled: true,
        featureVersion: null,
        minimumVersion: '0.0.0',
      });
      expect(
        fixture.state.engine.backgroundState.NetworkEnablementController
          .enabledNetworkMap.stellar,
      ).toStrictEqual({
        'stellar:pubnet': true,
        'stellar:testnet': true,
      });
      expect(fixture.state.user.multichainAccountsIntroModalSeen).toBe(true);
    });
  });
});
