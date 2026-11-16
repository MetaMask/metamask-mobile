import type {
  AccountState,
  PerpsMarketData,
  PerpsProviderType,
  Position,
} from '@metamask/perps-controller';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import type { PerpsStreamOverrides } from '../renderers/perpsViewRenderer';
import {
  createBtcMarketForViews,
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../fixtures/perpsViewFixtures';

// TAT-4392: core#11461 adds `AccountState.providerStates`. Once perps-controller
// ships it, tsc fails on this line. Then give each scenario per-exchange
// account states (Lighter down = Lighter 'unavailable') and delete the alias.
// @ts-expect-error TAT-4392: remove once perps-controller ships providerStates.
export type PerpsAccountProviderStates = AccountState['providerStates'];

interface Scenario {
  /** Total balance per exchange. A missing exchange has no data. */
  balances: Partial<Record<PerpsProviderType, string>>;
  markets: PerpsMarketData[];
  positions?: Position[];
}

const eth = (providerId: PerpsProviderType): PerpsMarketData =>
  createEthMarketForViews({ providerId });

const SCENARIOS = {
  bothFunded: {
    balances: { hyperliquid: '100', lighter: '50' },
    markets: [
      eth('hyperliquid'),
      createBtcMarketForViews({ providerId: 'lighter' }),
    ],
  },
  oneFunded: {
    balances: { hyperliquid: '100', lighter: '0' },
    markets: [
      eth('hyperliquid'),
      createBtcMarketForViews({ providerId: 'lighter' }),
    ],
  },
  sameMarketOnBoth: {
    balances: { hyperliquid: '100', lighter: '50' },
    markets: [eth('hyperliquid'), eth('lighter')],
    positions: [createLongPositionForViews({ providerId: 'lighter' })],
  },
  lighterDown: {
    balances: { hyperliquid: '100' },
    markets: [eth('hyperliquid')],
  },
} satisfies Record<string, Scenario>;

export type PerpsTwoExchangeScenario = keyof typeof SCENARIOS;

/**
 * Render options for a user with Hyperliquid and Lighter both enabled:
 * `renderPerpsHomeView(perpsTwoExchangeState('bothFunded'))`.
 * Also call `withLighterBuildEnabled()` in the describe block.
 */
export const perpsTwoExchangeState = (
  name: PerpsTwoExchangeScenario,
): {
  overrides: DeepPartial<RootState>;
  streamOverrides: PerpsStreamOverrides;
} => {
  const { balances, markets, positions = [] }: Scenario = SCENARIOS[name];
  const entries = Object.entries(balances);
  const total = entries.reduce((sum, [, balance]) => sum + Number(balance), 0);

  return {
    overrides: {
      engine: {
        backgroundState: {
          PerpsController: {
            activeProvider: 'aggregated',
            isEligible: true,
            isFirstTimeUser: { mainnet: false, testnet: false },
            perpsBalances: Object.fromEntries(
              entries.map(([provider, totalBalance]) => [
                provider,
                {
                  totalBalance,
                  unrealizedPnl: '0',
                  accountValue1dAgo: totalBalance,
                  lastUpdated: 0,
                },
              ]),
            ),
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              perpsLighterProviderEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
            },
          },
        },
      },
    },
    streamOverrides: {
      account: createFundedAccountForViews(String(total)),
      positions,
      orders: [],
      marketData: markets,
    },
  };
};
