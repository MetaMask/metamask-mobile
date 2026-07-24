import { isEvmAccountType } from '@metamask/keyring-api';
import Engine from '../../core/Engine';
import ReduxService from '../../core/redux';
import Logger from '../Logger';
import {
  selectEvmNetworkConfigurationsByChainId,
  selectNativeNetworkCurrencies,
} from '../../selectors/networkController';
import {
  selectSelectedAccountGroupId,
  selectSelectedAccountGroupInternalAccounts,
} from '../../selectors/multichainAccounts/accountTreeController';
import { selectBalanceByAccountGroup } from '../../selectors/assets/balances';

/**
 * USD range buckets for the `funding_amount_range` prop on
 * `Wallet Setup Completed` (import flow). Values mirror the enum in the
 * segment-schema repo (`metamask-onboarding/wallet-setup-completed.yaml`).
 */
export type FundingAmountRange =
  | '< 0.01'
  | '0.01 - 9.99'
  | '10.00 - 99.99'
  | '100.00 - 999.99'
  | '1000.00 - 9999.99'
  | '10000.00+';

/**
 * Buckets a USD-equivalent balance into a funding range (half-open
 * intervals: 10.00 falls in '10.00 - 99.99').
 * `< 0.01` means a successfully fetched (near-)zero balance — callers must
 * not pass amounts from a failed fetch (omit the prop instead).
 */
export const getFundingAmountRange = (amount: number): FundingAmountRange => {
  if (amount < 0.01) return '< 0.01';
  if (amount < 10) return '0.01 - 9.99';
  if (amount < 100) return '10.00 - 99.99';
  if (amount < 1000) return '100.00 - 999.99';
  if (amount < 10000) return '1000.00 - 9999.99';
  return '10000.00+';
};

export const FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS = 15000;

/**
 * Delays before retrying a failed refresh task. Initial sync of a freshly
 * imported wallet is a burst-y window (RPC flakes, rate limits), so the
 * schedule escalates instead of hammering; it stays well inside
 * {@link FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS}.
 */
export const FUNDING_AMOUNT_RETRY_DELAYS_MS = [300, 1000, 3000];

/**
 * Refreshes balances for the freshly imported wallet and returns the funding
 * range of the selected account group (Account 1 at import time), across
 * EVM popular mainnets (native + ERC-20) and the group's non-EVM accounts
 * (Solana etc.), in the user's currency (USD on a fresh install — onboarding
 * happens before the currency can be changed).
 *
 * Returns undefined — so the analytics prop is omitted and Mixpanel shows
 * "(not set)" — if any balance-refresh task fails or the fetch exceeds
 * {@link FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS}. A returned '< 0.01'
 * therefore always reflects a successful fetch of a zero balance.
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
    } = Engine.context;

    // Popular mainnets only, matching the wallet screen's balance refresh —
    // testnets contribute nothing to a fiat total and slow the fetch down.
    // NetworkEnablementController can list chains (e.g. Sei) that have no
    // NetworkController configuration; detectTokens/updateBalances throw
    // `Invalid chain ID` for those, so restrict to configured chains.
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

    // Every task must succeed: a partial fetch could misreport a funded
    // wallet as '< 0.01', which must only ever mean a confirmed zero balance.
    // Delayed retries per task absorb transient RPC failures and poisoned
    // shared batches (see FUNDING_AMOUNT_RETRY_DELAYS_MS).
    const pendingTasks = new Set<string>();
    const labeled = <T>(label: string, task: () => Promise<T>): Promise<T> => {
      pendingTasks.add(label);
      const attempt = (retriesUsed: number): Promise<T> =>
        task().catch((error) => {
          if (retriesUsed >= FUNDING_AMOUNT_RETRY_DELAYS_MS.length) {
            throw error;
          }
          return new Promise<T>((resolve, reject) => {
            setTimeout(
              () => attempt(retriesUsed + 1).then(resolve, reject),
              FUNDING_AMOUNT_RETRY_DELAYS_MS[retriesUsed],
            );
          });
        });
      return attempt(0).then((result) => {
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
        // _executePoll runs the same update as updateBalances but skips the
        // 200ms shared batch, where a concurrent caller's request for an
        // unconfigured chain (e.g. Sei tokens streamed by the account
        // activity service — Sei is an add-it-yourself network) rejects
        // every merged call with `Invalid chain ID`.
        labeled('tokenBalances', () =>
          TokenBalancesController._executePoll({ chainIds }),
        ),
      ]);

      // Non-EVM (Solana etc.) balances for the selected group. Gathered
      // after the EVM phase so snap accounts still being created
      // asynchronously at import time have had a chance to appear; accounts
      // that appear later than that are missed rather than waited on.
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
      // Conversion rates last, once the accounts' asset lists exist.
      await labeled('multichainRates', () =>
        MultichainAssetsRatesController.updateAssetsRates(),
      );
    };
    const refreshPromise = runRefresh();
    // Rejections after the timeout wins the race must not surface as
    // unhandled promise rejections.
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
    const selectedGroupId = selectSelectedAccountGroupId(refreshedState);
    if (!selectedGroupId) {
      return undefined;
    }
    const { totalBalanceInUserCurrency } =
      selectBalanceByAccountGroup(selectedGroupId)(refreshedState);
    if (!Number.isFinite(totalBalanceInUserCurrency)) {
      return undefined;
    }
    return getFundingAmountRange(totalBalanceInUserCurrency);
  } catch (error) {
    Logger.log('fetchImportedWalletFundingAmountRange failed', error);
    return undefined;
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
  }
}
