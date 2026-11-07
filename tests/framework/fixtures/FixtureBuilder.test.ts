import FixtureBuilder, { DEFAULT_FIXTURE_ACCOUNT } from './FixtureBuilder';
import {
  REFEREE_INVITED_BENEFIT_TITLE,
  REWARDS_MONEY_E2E_PROFILE_ID,
  REWARDS_MONEY_SUBSCRIPTION_ID,
} from '../../api-mocking/mock-responses/rewards-money';
import { STATE_LOG_SEEDED_MARKERS } from './state-log-omitted-fields';
import defaultFixture from './json/default-fixture.json';

/**
 * The 6 legacy asset controllers were removed from the app and from the
 * persisted `default-fixture.json` (so the fixture schema matches the app),
 * but many builder methods and specs still write to these keys. They are
 * re-injected in memory by `withDefaultFixture()` via
 * `LEGACY_ASSET_CONTROLLERS_STATE`. The app ignores them.
 *
 * These tests pin both halves of that contract: the JSON stays clean, and the
 * builder restores the legacy keys with their exact default shapes.
 */
describe('FixtureBuilder legacy asset controllers', () => {
  const LEGACY_KEYS = [
    'AccountTrackerController',
    'CurrencyRateController',
    'MultichainAssetsController',
    'MultichainAssetsRatesController',
    'TokenBalancesController',
    'TokenRatesController',
  ] as const;

  describe('default-fixture.json', () => {
    it('omits the removed legacy asset controllers', () => {
      const backgroundState = (
        defaultFixture as {
          state: { engine: { backgroundState: Record<string, unknown> } };
        }
      ).state.engine.backgroundState;

      for (const key of LEGACY_KEYS) {
        expect(backgroundState).not.toHaveProperty(key);
      }
    });
  });

  describe('withDefaultFixture()', () => {
    it('re-injects every legacy asset controller in memory', () => {
      const fixture = new FixtureBuilder().withDefaultFixture().build();
      const backgroundState = fixture.state.engine.backgroundState as Record<
        string,
        unknown
      >;

      for (const key of LEGACY_KEYS) {
        expect(backgroundState).toHaveProperty(key);
      }
    });

    it('restores the exact legacy controller default shapes', () => {
      const fixture = new FixtureBuilder().withDefaultFixture().build();
      const backgroundState = fixture.state.engine.backgroundState as Record<
        string,
        unknown
      >;

      expect(backgroundState.AccountTrackerController).toStrictEqual({
        accountsByChainId: {
          '1': {
            '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3': { balance: '0x0' },
          },
          '64': {
            '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3': { balance: '0x0' },
          },
        },
      });

      expect(backgroundState.CurrencyRateController).toStrictEqual({
        currencyRates: {
          ETH: {
            conversionDate: 1684232383.997,
            conversionRate: 1815.41,
            usdConversionRate: 1815.41,
          },
        },
        currentCurrency: 'usd',
      });

      expect(backgroundState.MultichainAssetsController).toStrictEqual({
        accountsAssets: {},
        assetsMetadata: {},
      });

      expect(backgroundState.MultichainAssetsRatesController).toStrictEqual({
        conversionRates: {},
      });

      expect(backgroundState.TokenBalancesController).toStrictEqual({
        tokenBalances: {},
      });

      expect(backgroundState.TokenRatesController).toStrictEqual({
        marketData: {},
      });
    });
  });
});

describe('FixtureBuilder state log fields', () => {
  it('seeds every marker for fields excluded from state logs', () => {
    const fixture = new FixtureBuilder().withStateLogOmittedFields().build();

    const serialized = JSON.stringify(fixture.state.engine.backgroundState);

    for (const marker of STATE_LOG_SEEDED_MARKERS) {
      expect(serialized).toContain(marker);
    }
  });

  it('keeps existing card controller fields while seeding excluded ones', () => {
    const fixture = new FixtureBuilder().withStateLogOmittedFields().build();
    const card = fixture.state.engine.backgroundState.CardController as {
      activeProviderId: string;
      providerUserId: string;
    };

    expect(card.activeProviderId).toBe('baanx');
    expect(card.providerUserId).toBe('state-export-card-user');
  });

  it('keeps existing rewards money fields while seeding excluded ones', () => {
    const builder = new FixtureBuilder();
    const background = (
      builder as unknown as {
        fixture: {
          state: { engine: { backgroundState: Record<string, unknown> } };
        };
      }
    ).fixture.state.engine.backgroundState;
    background.RewardsMoneyController = { existingField: 'kept' };

    const fixture = builder.withStateLogOmittedFields().build();
    const rewardsMoney = fixture.state.engine.backgroundState
      .RewardsMoneyController as Record<string, unknown>;

    expect(rewardsMoney.existingField).toBe('kept');
    expect(rewardsMoney.referralMe).toBeDefined();
  });
});

describe('FixtureBuilder rewards money referee', () => {
  it('seeds an opted-in subscription and a referee referral payload', () => {
    const fixture = new FixtureBuilder().withRewardsMoneyReferee().build();
    const background = fixture.state.engine.backgroundState;
    const rewards = background.RewardsController as {
      activeAccount: { account: string; subscriptionId: string };
    };
    const rewardsMoney = background.RewardsMoneyController as {
      referralMe: Record<
        string,
        {
          payload: {
            roles: string[];
            localized_text: { invitedBenefitTitle: string };
          };
        }
      >;
    };
    const slice = fixture.state.rewardsMoney as {
      referralMe: Record<string, { data: { roles: string[] } }>;
    };
    const payload =
      rewardsMoney.referralMe[REWARDS_MONEY_E2E_PROFILE_ID].payload;

    expect(rewards.activeAccount.subscriptionId).toBe(
      REWARDS_MONEY_SUBSCRIPTION_ID,
    );
    expect(rewards.activeAccount.account).toBe(
      `eip155:1:${DEFAULT_FIXTURE_ACCOUNT}`,
    );
    expect(payload.roles).toEqual(['REFEREE']);
    expect(payload.localized_text.invitedBenefitTitle).toBe(
      REFEREE_INVITED_BENEFIT_TITLE,
    );
    expect(slice.referralMe[REWARDS_MONEY_E2E_PROFILE_ID].data.roles).toEqual([
      'REFEREE',
    ]);
  });
});
