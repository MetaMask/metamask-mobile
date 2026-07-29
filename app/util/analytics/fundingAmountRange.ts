import { isEvmAccountType } from '@metamask/keyring-api';
import Engine from '../../core/Engine';
import ReduxService from '../../core/redux';
import Logger from '../Logger';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectNativeNetworkCurrencies,
} from '../../selectors/networkController';
import { selectSelectedAccountGroupInternalAccounts } from '../../selectors/multichainAccounts/accountTreeController';
import { selectBalanceBySelectedAccountGroup } from '../../selectors/assets/balances';

/**
 * USD buckets for the `funding_amount_range` prop on `Wallet Setup
 * Completed` (import flow). Mirrors the enum in the segment-schema repo.
 */
export type FundingAmountRange =
  | '< 0.01'
  | '0.01 - 9.99'
  | '10.00 - 99.99'
  | '100.00 - 999.99'
  | '1000.00 - 9999.99'
  | '10000.00+';

/**
 * Buckets a USD balance into a funding range. Intervals are half-open:
 * 10.00 falls in '10.00 - 99.99'. Only pass successfully fetched amounts —
 * '< 0.01' must always mean a confirmed zero balance.
 */
export const getFundingAmountRange = (amount: number): FundingAmountRange => {
  if (amount < 0.01) return '< 0.01';
  if (amount < 10) return '0.01 - 9.99';
  if (amount < 100) return '10.00 - 99.99';
  if (amount < 1000) return '100.00 - 999.99';
  if (amount < 10000) return '1000.00 - 9999.99';
  return '10000.00+';
};

/**
 * Fetch budget. Guarantees the deferred event emission fires even if a
 * refresh task hangs; fetches slower than this omit the prop instead.
 */
export const FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS = 20000;

/**
 * Refreshes and returns the funding range of the selected account group
 * (Account 1 at import time) — the same balance the wallet home displays:
 * popular EVM mainnets plus the group's non-EVM accounts, in USD.
 *
 * Resolves undefined (prop omitted, "(not set)" in Mixpanel) if any refresh
 * task fails or {@link FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS} elapses, so
 * '< 0.01' always means a confirmed zero balance. Not a pure read — it warms
 * the same controller state the wallet home refreshes on mount — but it
 * never throws and never blocks the caller.
 */
export async function fetchImportedWalletFundingAmountRange(): Promise<
  FundingAmountRange | undefined
> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const state = ReduxService.store.getState();
    const evmNetworkConfigurations =
      selectEvmNetworkConfigurationsByChainId(state);
    const nativeCurrencies = selectNativeNetworkCurrencies(state);

    const {
      AccountTrackerController,
      CurrencyRateController,
      MultichainAssetsRatesController,
      MultichainBalancesController,
      NetworkEnablementController,
      TokenBalancesController,
      TokenDetectionController,
      TokenRatesController,
    } = Engine.context;

    const chainIds =
      NetworkEnablementController.listPopularEvmNetworks().filter(
        (chainId) => evmNetworkConfigurations[chainId],
      );
    if (!chainIds.length) {
      return undefined;
    }
    const chainIdSet = new Set<string>(chainIds);
    const networkClientIds = Object.entries(evmNetworkConfigurations)
      .filter(([chainId]) => chainIdSet.has(chainId))
      .map(
        ([, { defaultRpcEndpointIndex, rpcEndpoints }]) =>
          rpcEndpoints[defaultRpcEndpointIndex]?.networkClientId,
      )
      .filter((id): id is string => Boolean(id));

    const pendingTasks = new Set<string>();
    const labeled = <T>(label: string, task: () => Promise<T>): Promise<T> => {
      pendingTasks.add(label);
      return task().then((result) => {
        pendingTasks.delete(label);
        return result;
      });
    };
    const runRefresh = async () => {
      await Promise.all([
        labeled('accountTracker', () =>
          AccountTrackerController.refresh(networkClientIds),
        ),
        labeled('currencyRate', () =>
          CurrencyRateController.updateExchangeRate(nativeCurrencies),
        ),
        labeled('tokenDetection', () =>
          TokenDetectionController.detectTokens({ chainIds }),
        ),
        labeled('tokenBalances', () =>
          TokenBalancesController._executePoll({ chainIds }).catch((error) => {
            const failedChain = /^Invalid chain ID "(?<chainId>.+)"$/.exec(
              error instanceof Error ? error.message : '',
            )?.groups?.chainId;
            if (failedChain && !chainIdSet.has(failedChain)) {
              Logger.log(
                `fundingAmountRange: ignoring token-import failure for chain ${failedChain} — it has no NetworkController configuration and was not part of this refresh; requested-chain balances are unaffected`,
              );
              return undefined;
            }
            throw error;
          }),
        ),
      ]);

      await labeled('tokenRates', () =>
        TokenRatesController._executePoll({ chainIds }),
      );

      const nonEvmAccounts = selectSelectedAccountGroupInternalAccounts(
        ReduxService.store.getState(),
      ).filter((account) => !isEvmAccountType(account.type));
      if (!nonEvmAccounts.length) {
        return;
      }
      await Promise.all(
        nonEvmAccounts.map((account) =>
          labeled(`multichainBalance:${account.id}`, () =>
            MultichainBalancesController.updateBalance(account.id),
          ),
        ),
      );
      await labeled('multichainRates', () =>
        MultichainAssetsRatesController.updateAssetsRates(),
      );
    };
    const refreshPromise = runRefresh();
    refreshPromise.catch(() => undefined);

    await Promise.race([
      refreshPromise,
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(
          () =>
            reject(
              new Error(
                `Funding amount balance fetch timed out (pending: ${[
                  ...pendingTasks,
                ].join(', ')})`,
              ),
            ),
          FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS,
        );
      }),
    ]);

    const refreshedState = ReduxService.store.getState();
    const groupBalance = selectBalanceBySelectedAccountGroup(
      NetworkEnablementController.listPopularNetworks(),
    )(refreshedState);
    if (!groupBalance) {
      return undefined;
    }
    const { totalBalanceInUserCurrency } = groupBalance;
    if (!Number.isFinite(totalBalanceInUserCurrency)) {
      return undefined;
    }
    return getFundingAmountRange(totalBalanceInUserCurrency);
  } catch (error) {
    Logger.log(
      'fundingAmountRange: balance fetch failed — funding_amount_range will be omitted from Wallet Setup Completed',
      error,
    );
    return undefined;
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}
