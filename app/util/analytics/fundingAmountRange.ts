import Engine from '../../core/Engine';
import EngineService from '../../core/EngineService';
import ReduxService from '../../core/redux';
import { FUNGIBLE_ASSET_TYPES } from '../../core/Assets/accountGroupAssetLoader';
import { selectUnifiedBalanceBySelectedAccountGroup } from '../../selectors/assets/balances';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';
import Logger from '../Logger';

/**
 * USD buckets for the `funding_amount_range` prop on `Wallet Setup
 * Completed` and `Onboarding Completed` (import flow). Mirrors the enum in
 * the segment-schema repo.
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
 * Fetch budget. Guarantees both deferred events fire even if the fetch hangs;
 * fetches slower than this omit the prop instead.
 */
export const FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS = 20000;

let pendingImportedWalletFundingAmountRange:
  | Promise<FundingAmountRange | undefined>
  | undefined;

async function resolveImportedWalletFundingAmountRange(): Promise<
  FundingAmountRange | undefined
> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    // With Basic Functionality off, the awaited fetch skips every balance source.
    if (!selectBasicFunctionalityEnabled(ReduxService.store.getState())) {
      return undefined;
    }
    const {
      AccountTreeController,
      AssetsController,
      NetworkEnablementController,
    } = Engine.context;
    const accounts =
      AccountTreeController.getAccountsFromSelectedAccountGroup();
    const chainIds = NetworkEnablementController.listPopularNetworks();
    if (!accounts.length || !chainIds.length) {
      return undefined;
    }

    const fetchPromise = AssetsController.getAssets(accounts, {
      chainIds,
      assetTypes: FUNGIBLE_ASSET_TYPES,
      forceUpdate: true,
    });
    fetchPromise.catch(() => undefined);

    await Promise.race([
      fetchPromise,
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error('Funding amount balance fetch timed out')),
          FUNDING_AMOUNT_BALANCE_FETCH_TIMEOUT_MS,
        );
      }),
    ]);

    // Redux trails controller state by one EngineService batch.
    EngineService.flushState();
    const groupBalance = selectUnifiedBalanceBySelectedAccountGroup(chainIds)(
      ReduxService.store.getState(),
    );
    if (
      !groupBalance ||
      groupBalance.userCurrency !== 'usd' ||
      !Number.isFinite(groupBalance.totalBalanceInUserCurrency)
    ) {
      return undefined;
    }
    return getFundingAmountRange(groupBalance.totalBalanceInUserCurrency);
  } catch (error) {
    Logger.log(
      'fundingAmountRange: balance fetch failed — funding_amount_range will be omitted',
      error,
    );
    return undefined;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Force-fetches the selected account group (Account 1 at import time) on the
 * popular networks and buckets the same USD total the wallet home shows.
 * The promise is kept for {@link takeImportedWalletFundingAmountRange}, so
 * `Wallet Setup Completed` and `Onboarding Completed` share one fetch.
 *
 * Never rejects. Resolves undefined (prop omitted) on failure, timeout, or a
 * non-USD currency. Known gap: `getAssets` doesn't wait for the controller's
 * background pass (Snap and RPC-only chains), so a wallet funded only there
 * reads low, possibly '< 0.01'.
 */
export function fetchImportedWalletFundingAmountRange(): Promise<
  FundingAmountRange | undefined
> {
  pendingImportedWalletFundingAmountRange =
    resolveImportedWalletFundingAmountRange();
  return pendingImportedWalletFundingAmountRange;
}

/**
 * Hands over the fetch started by {@link fetchImportedWalletFundingAmountRange}
 * and clears it, so a later onboarding never reuses a stale value.
 */
export function takeImportedWalletFundingAmountRange():
  | Promise<FundingAmountRange | undefined>
  | undefined {
  const pending = pendingImportedWalletFundingAmountRange;
  pendingImportedWalletFundingAmountRange = undefined;
  return pending;
}
