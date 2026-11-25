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

// These are synthetic two-exchange fixtures, not snapshots of what the
// installed controller emits. Each scenario still carries per-exchange account
// states (Lighter down = Lighter 'unavailable').
export type PerpsAccountProviderStates = AccountState['providerStates'];

interface ExchangeAccount {
  total: string;
  marginUsed?: string;
  unrealizedPnl?: string;
}

interface Scenario {
  /** Account per exchange. A missing exchange has no data. */
  balances: Partial<Record<PerpsProviderType, ExchangeAccount>>;
  markets: PerpsMarketData[];
  positions?: Position[];
}

const eth = (providerId: PerpsProviderType): PerpsMarketData =>
  createEthMarketForViews({ providerId });

const SCENARIOS = {
  bothFunded: {
    balances: { hyperliquid: { total: '100' }, lighter: { total: '50' } },
    markets: [
      eth('hyperliquid'),
      createBtcMarketForViews({ providerId: 'lighter' }),
    ],
  },
  oneFunded: {
    balances: { hyperliquid: { total: '100' }, lighter: { total: '0' } },
    markets: [
      eth('hyperliquid'),
      createBtcMarketForViews({ providerId: 'lighter' }),
    ],
  },
  sameMarketOnBoth: {
    balances: {
      hyperliquid: { total: '100' },
      lighter: { total: '50', marginUsed: '8.33', unrealizedPnl: '1' },
    },
    markets: [eth('hyperliquid'), eth('lighter')],
    positions: [
      createLongPositionForViews({
        providerId: 'lighter',
        size: '0.01',
        positionValue: '25',
        marginUsed: '8.33',
        unrealizedPnl: '1',
      }),
    ],
  },
  lighterDown: {
    balances: { hyperliquid: { total: '100' } },
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
  const sum = (
    pick: (account: ExchangeAccount) => string | undefined,
  ): number =>
    entries.reduce((acc, [, account]) => acc + Number(pick(account) ?? 0), 0);
  const total = sum((account) => account.total);
  const marginUsed = sum((account) => account.marginUsed);
  const unrealizedPnl = sum((account) => account.unrealizedPnl);

  return {
    overrides: {
      engine: {
        backgroundState: {
          PerpsController: {
            activeProvider: 'aggregated',
            // Grouped market rows display the default venue's data; without
            // this the venue-filter selector cannot resolve the display row.
            defaultProvider: 'hyperliquid',
            isEligible: true,
            isFirstTimeUser: { mainnet: false, testnet: false },
            perpsBalances: Object.fromEntries(
              entries.map(([provider, account]) => [
                provider,
                {
                  totalBalance: account.total,
                  unrealizedPnl: account.unrealizedPnl ?? '0',
                  accountValue1dAgo: account.total,
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
      account: {
        ...createFundedAccountForViews(String(total)),
        spendableBalance: String(Number((total - marginUsed).toFixed(2))),
        withdrawableBalance: String(Number((total - marginUsed).toFixed(2))),
        marginUsed: String(marginUsed),
        unrealizedPnl: String(unrealizedPnl),
      },
      positions,
      orders: [],
      marketData: markets,
    },
  };
};
