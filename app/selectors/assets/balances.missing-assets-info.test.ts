/**
 * Aggregation behaviour for `assetsBalance` rows that have no matching
 * `assetsInfo` entry.
 *
 * Unlike `balances.test.ts`, nothing here is mocked: the real selectors run
 * against a trimmed slice of a real device state log
 * (`__fixtures__/assets-controller-state-log`, MetaMask Mobile 8.9.0/6689)
 * and the real `@metamask/assets-controller` aggregation does the maths.
 */
import type { AssetsControllerState } from '@metamask/assets-controller';
import { backgroundState } from '../../util/test/initial-root-state';
import type { RootState } from '../../reducers';
import {
  GROUP_ID,
  USER_CURRENCY,
  WALLET_ID,
  assetsControllerStateLog,
  stateLog,
  withPricedOrphanAssetsInfo,
} from './__fixtures__/assets-controller-state-log';
import {
  selectBalanceForAllWallets,
  selectBalanceForAllWalletsAndChains,
  selectUnifiedBalanceBySelectedAccountGroup,
} from './balances';

/**
 * Builds a RootState around the state-log slice, backed by default controller
 * state so every selector input resolves without extra stubbing.
 *
 * @param assetsControllerState - AssetsController slice to aggregate.
 * @returns RootState for the balances selectors.
 */
const makeStateFromLog = (
  assetsControllerState: AssetsControllerState = assetsControllerStateLog,
) =>
  ({
    engine: {
      backgroundState: {
        ...backgroundState,
        AssetsController: assetsControllerState,
        AccountTreeController: stateLog.AccountTreeController,
        NetworkEnablementController: stateLog.NetworkEnablementController,
        RemoteFeatureFlagController: {
          ...backgroundState.RemoteFeatureFlagController,
          remoteFeatureFlags: {
            ...backgroundState.RemoteFeatureFlagController.remoteFeatureFlags,
            ...stateLog.RemoteFeatureFlagController.remoteFeatureFlags,
          },
        },
      },
    },
  }) as unknown as RootState;

/**
 * Aggregates the group total twice so the snapshots pin both the right answer
 * and the wrong one side by side.
 *
 * `expectedTotalOrphanFiatExcluded` is what the UI must show: orphan balances
 * carry no `assetsInfo`, so aggregation skips them.
 *
 * `regressionTotalOrphanFiatIncluded` is the wrong number this file guards
 * against. The priced orphan is given an `assetsInfo` entry, which lets
 * aggregation count roughly 4440 CHF of fiat the UI can never render.
 *
 * If the exclusion breaks, the expected total moves towards the regression one.
 *
 * @param selectGroupTotal - Reads the group total out of a RootState.
 * @returns The expected total alongside the inflated one.
 */
const aggregateGroupTotalBothWays = (
  selectGroupTotal: (state: RootState) => number,
) => ({
  expectedTotalOrphanFiatExcluded: selectGroupTotal(makeStateFromLog()),
  regressionTotalOrphanFiatIncluded: selectGroupTotal(
    makeStateFromLog(withPricedOrphanAssetsInfo()),
  ),
});

describe('balances aggregation for assets missing assetsInfo', () => {
  describe('selectBalanceForAllWalletsAndChains', () => {
    it('excludes priced orphan fiat from the group total', () => {
      const output = aggregateGroupTotalBothWays(
        (state) =>
          selectBalanceForAllWalletsAndChains(state).wallets[WALLET_ID].groups[
            GROUP_ID
          ].totalBalanceInUserCurrency,
      );

      expect(output).toMatchInlineSnapshot(`
        {
          "expectedTotalOrphanFiatExcluded": 376.1228746295075,
          "regressionTotalOrphanFiatIncluded": 4816.35286302826,
        }
      `);
    });

    it('reports the user currency from the state log', () => {
      const { userCurrency } =
        selectBalanceForAllWalletsAndChains(makeStateFromLog());

      expect(userCurrency).toBe(USER_CURRENCY);
    });
  });

  describe('selectBalanceForAllWallets', () => {
    it('excludes priced orphan fiat while filtering by enabled networks', () => {
      // Optimism (0xa) is enabled in the log, so network filtering alone
      // would not drop these balances.
      const output = aggregateGroupTotalBothWays(
        (state) =>
          selectBalanceForAllWallets()(state).wallets[WALLET_ID].groups[
            GROUP_ID
          ].totalBalanceInUserCurrency,
      );

      expect(output).toMatchInlineSnapshot(`
        {
          "expectedTotalOrphanFiatExcluded": 376.1228746295075,
          "regressionTotalOrphanFiatIncluded": 4816.35286302826,
        }
      `);
    });
  });

  describe('selectUnifiedBalanceBySelectedAccountGroup', () => {
    it('reports the selected group total without priced orphan fiat', () => {
      const output = aggregateGroupTotalBothWays((state) => {
        const balance = selectUnifiedBalanceBySelectedAccountGroup()(state);

        if (balance?.walletId !== WALLET_ID || balance?.groupId !== GROUP_ID) {
          throw new Error(
            `Expected the balance for ${GROUP_ID}, got ${JSON.stringify(balance)}`,
          );
        }

        return balance.totalBalanceInUserCurrency;
      });

      expect(output).toMatchInlineSnapshot(`
        {
          "expectedTotalOrphanFiatExcluded": 376.1228746295075,
          "regressionTotalOrphanFiatIncluded": 4816.35286302826,
        }
      `);
    });
  });
});
