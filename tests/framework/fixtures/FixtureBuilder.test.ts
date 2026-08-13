import FixtureBuilder from './FixtureBuilder';
import type { Fixture } from './types';

// `EngineBackgroundState` types unlisted controllers as `unknown` via its index
// signature, so these reads narrow the two slices the Stellar contract covers.
function getRemoteFeatureFlags(fixture: Fixture): Record<string, unknown> {
  const controller = fixture.state.engine.backgroundState
    .RemoteFeatureFlagController as {
    remoteFeatureFlags: Record<string, unknown>;
  };

  return controller.remoteFeatureFlags;
}

function getEnabledNetworkMap(fixture: Fixture): Record<string, unknown> {
  const controller = fixture.state.engine.backgroundState
    .NetworkEnablementController as {
    enabledNetworkMap: Record<string, unknown>;
  };

  return controller.enabledNetworkMap;
}

describe('FixtureBuilder', () => {
  describe('build()', () => {
    it('omits stellarAccounts from remote feature flags by default', () => {
      const fixture = new FixtureBuilder().build();

      expect(getRemoteFeatureFlags(fixture)).not.toHaveProperty(
        'stellarAccounts',
      );
    });
  });

  describe('withStellarEnabled()', () => {
    it('enables stellarAccounts, Stellar networks, and suppresses multichain intro modal', () => {
      const fixture = new FixtureBuilder().withStellarEnabled().build();

      expect(getRemoteFeatureFlags(fixture).stellarAccounts).toStrictEqual({
        enabled: true,
        featureVersion: null,
        minimumVersion: '0.0.0',
      });
      expect(getEnabledNetworkMap(fixture).stellar).toStrictEqual({
        'stellar:pubnet': true,
        'stellar:testnet': true,
      });
      expect(fixture.state.user.multichainAccountsIntroModalSeen).toBe(true);
    });
  });
});
