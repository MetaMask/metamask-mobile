import type {
  AccountState,
  PerpsControllerState,
  PerpsProviderType,
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

/**
 * Ready-made render options for screens with Hyperliquid and Lighter both
 * enabled. Uses the perps-controller 22.3.0 state shape; the tripwire below
 * fires when MetaMask/core#11461 (TAT-4392) ships per-exchange account state,
 * at which point these presets should move to providerStates/aggregate.
 */

export type PerpsTwoExchangeScenario =
  | 'bothFunded' // HL 100 + Lighter 50, total 150
  | 'oneFunded' // HL 100, Lighter 0, total 100
  | 'sameMarketOnBoth' // both funded; ETH on HL and Lighter; ETH position on Lighter
  | 'lighterDown'; // HL 100, Lighter down: no Lighter balance/markets, total 100

type PerpsBalances = PerpsControllerState['perpsBalances'];

// TAT-4392 tripwire: core#11461 adds `providerStates` and `aggregate` to
// AccountState. Today the field doesn't exist, so this directive is satisfied;
// when the package updates, tsc reports it as unused and fails CI here. Then
// give each scenario per-exchange providerStates/aggregate (Lighter down =
// Lighter 'unavailable', aggregate 'partial') and delete this alias.
// @ts-expect-error TAT-4392: remove once perps-controller ships providerStates.
export type PerpsAccountProviderStates = AccountState['providerStates'];

const perpsBalance = (totalBalance: string) => ({
  totalBalance,
  unrealizedPnl: '0',
  accountValue1dAgo: totalBalance,
  lastUpdated: 0,
});

const toAmount = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

// Today's aggregated account is a single combined AccountState; null means the
// venue is down and contributes nothing. TAT-4392 replaces this with
// providerStates/aggregate (see the tripwire above).
const aggregatedAccount = (
  byProvider: Record<PerpsProviderType, string | null>,
): AccountState => {
  const total = Object.values(byProvider)
    .filter((b): b is string => b !== null)
    .reduce((sum, b) => sum + toAmount(b), 0)
    .toString();

  return createFundedAccountForViews(total);
};

const baseOverrides = (
  perpsBalances: PerpsBalances,
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      PerpsController: {
        activeProvider: 'aggregated',
        isEligible: true,
        isFirstTimeUser: { mainnet: false, testnet: false },
        perpsBalances,
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
});

/**
 * Returns `{ overrides, streamOverrides }` for the scenario. Spread into any
 * perps renderer, e.g. `renderPerpsHomeView(perpsTwoExchangeState('bothFunded'))`.
 * Requires the Lighter build flag: call `withLighterBuildEnabled()` in the
 * describe block (see tests/component-view/helpers/perpsViewTestHelpers).
 */
export const perpsTwoExchangeState = (
  scenario: PerpsTwoExchangeScenario,
): {
  overrides: DeepPartial<RootState>;
  streamOverrides: PerpsStreamOverrides;
} => {
  switch (scenario) {
    case 'bothFunded':
      return {
        overrides: baseOverrides({
          hyperliquid: perpsBalance('100'),
          lighter: perpsBalance('50'),
        }),
        streamOverrides: {
          account: aggregatedAccount({ hyperliquid: '100', lighter: '50' }),
          positions: [],
          orders: [],
          marketData: [
            createEthMarketForViews({ providerId: 'hyperliquid' }),
            createBtcMarketForViews({ providerId: 'lighter' }),
          ],
        },
      };
    case 'oneFunded':
      return {
        overrides: baseOverrides({
          hyperliquid: perpsBalance('100'),
          lighter: perpsBalance('0'),
        }),
        streamOverrides: {
          account: aggregatedAccount({ hyperliquid: '100', lighter: '0' }),
          positions: [],
          orders: [],
          marketData: [
            createEthMarketForViews({ providerId: 'hyperliquid' }),
            createBtcMarketForViews({ providerId: 'lighter' }),
          ],
        },
      };
    case 'sameMarketOnBoth':
      return {
        overrides: baseOverrides({
          hyperliquid: perpsBalance('100'),
          lighter: perpsBalance('50'),
        }),
        streamOverrides: {
          account: aggregatedAccount({ hyperliquid: '100', lighter: '50' }),
          positions: [createLongPositionForViews({ providerId: 'lighter' })],
          orders: [],
          marketData: [
            createEthMarketForViews({ providerId: 'hyperliquid' }),
            createEthMarketForViews({ providerId: 'lighter' }),
          ],
        },
      };
    case 'lighterDown':
      return {
        overrides: baseOverrides({ hyperliquid: perpsBalance('100') }),
        streamOverrides: {
          account: aggregatedAccount({ hyperliquid: '100', lighter: null }),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews({ providerId: 'hyperliquid' })],
        },
      };
  }
};
