import type { InternalAccount } from '@metamask/keyring-internal-api';
import { createProjectLogger, type CaipChainId } from '@metamask/utils';
import type { AssetType as AssetsControllerAssetType } from '@metamask/assets-controller';
import type { AccountGroupId } from '@metamask/account-api';
import Engine from '../Engine';
import ReduxService from '../redux';
import type { RootState } from '../../reducers';
import { selectInternalAccountByAddresses } from '../../selectors/accountsController';
import { selectAccountToGroupMap } from '../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsByGroupId } from '../../selectors/multichainAccounts/accounts';
import {
  selectEvmEnabledCaipNetworks,
  selectNonEVMEnabledNetworks,
} from '../../selectors/networkEnablementController';
import { createDeepEqualSelector } from '../../selectors/util';

const log = createProjectLogger('account-group-asset-loader');

/**
 * Asset types shown in token lists: native + ERC-20 / SPL fungibles, excluding
 * NFT collections. Shared so every asset refresh path requests the same shape.
 */
export const FUNGIBLE_ASSET_TYPES: AssetsControllerAssetType[] = ['fungible'];

/**
 * Safety cap on how long a surface is kept in its loading state. The underlying
 * fetch is *not* cancelled when this elapses — it is left to settle so it can
 * still commit its results and so a retry is never racing it. Only the pending
 * flag is cleared, so a hung data source cannot pin a skeleton forever.
 */
export const ACCOUNT_GROUP_ASSET_FETCH_TIMEOUT_MS = 5000;

/**
 * Every enabled chain, EVM and non-EVM, as CAIP-2 ids.
 *
 * Memoized on a deep comparison so it is safe to read from `useSelector`
 * without re-rendering on every unrelated store change.
 */
export const selectEnabledCaipChainIds = createDeepEqualSelector(
  selectEvmEnabledCaipNetworks,
  selectNonEVMEnabledNetworks,
  (evmCaipChainIds, nonEvmChainIds) =>
    [...evmCaipChainIds, ...nonEvmChainIds] as CaipChainId[],
);

/** One account group's accounts, as resolved by the caller. */
export interface AccountGroupAssetRequest {
  accountGroupId: string;
  accounts: InternalAccount[];
}

export interface LoadAccountGroupAssetsParams {
  groups: AccountGroupAssetRequest[];
  /** CAIP-2 chain IDs to fetch. */
  caipChainIds: CaipChainId[];
}

/**
 * Account groups whose assets have been requested at least once this session.
 *
 * Loads are cached per session rather than per mount: assets land in controller
 * state, so once a group has been fetched the ordinary selectors keep serving
 * it. Re-fetching on every mount would add latency for no benefit.
 *
 * An entry is only removed when a fetch is known to have failed, which happens
 * after the underlying promise settles — never on timeout — so a retry can
 * never overlap a fetch that is still running.
 */
const requestedGroupIds = new Set<string>();

/** Groups with a fetch currently in flight, for loading UI. */
const pendingGroupIds = new Set<string>();

const listeners = new Set<() => void>();

function emit() {
  for (const listener of [...listeners]) {
    listener();
  }
}

/**
 * Subscribe to changes in the set of in-flight account group asset fetches.
 *
 * @param listener - Called after any group transitions in or out of pending.
 * @returns Unsubscribe function.
 */
export function subscribeToAccountGroupAssetLoads(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Whether an asset fetch is currently in flight for the given account group.
 *
 * @param accountGroupId - Account group to check, if any.
 * @returns True while a fetch for that group is in flight.
 */
export function isAccountGroupAssetLoadPending(accountGroupId?: string) {
  return (
    Boolean(accountGroupId) && pendingGroupIds.has(accountGroupId as string)
  );
}

function clearPending(groupIds: string[]) {
  let changed = false;

  for (const groupId of groupIds) {
    changed = pendingGroupIds.delete(groupId) || changed;
  }

  if (changed) {
    emit();
  }
}

/**
 * Fetch assets for account groups the app has never loaded.
 *
 * `AssetsController` only ever fetches for the *selected* account group: every
 * automatic path resolves accounts through
 * `AccountTreeController:getAccountsFromSelectedAccountGroup`. A group the user
 * has never activated therefore has no entry in assets state, so
 * `selectAssetsByAccountGroupId` reports empty — indistinguishable from a
 * genuinely empty account. Surfaces that show assets for a non-selected account
 * (the MM Pay "Pay with" token list) must request the data.
 *
 * Groups already requested this session are skipped, and all remaining groups
 * are fetched in a single batched controller call.
 *
 * @param params - Fetch parameters.
 * @param params.groups - Account groups to load, with their resolved accounts.
 * @param params.caipChainIds - CAIP-2 chain IDs to fetch.
 */
export async function loadAccountGroupAssets({
  groups,
  caipChainIds,
}: LoadAccountGroupAssetsParams): Promise<void> {
  if (caipChainIds.length === 0) {
    return;
  }

  const newGroups = groups.filter(
    ({ accountGroupId, accounts }) =>
      accountGroupId &&
      accounts.length > 0 &&
      !requestedGroupIds.has(accountGroupId),
  );

  if (newGroups.length === 0) {
    return;
  }

  const groupIds = newGroups.map(({ accountGroupId }) => accountGroupId);
  const accounts = dedupeAccounts(
    newGroups.flatMap(({ accounts: groupAccounts }) => groupAccounts),
  );

  for (const groupId of groupIds) {
    requestedGroupIds.add(groupId);
    pendingGroupIds.add(groupId);
  }
  emit();

  // Resolves to a success flag rather than rejecting, so the fetch can never
  // surface as an unhandled rejection once the timeout below has stopped
  // anyone waiting on it. Started inside the promise chain so a synchronous
  // throw from `getAssets` is captured the same way as an async rejection.
  const succeeded = Promise.resolve()
    .then(() =>
      Engine.context.AssetsController.getAssets(accounts, {
        chainIds: caipChainIds,
        assetTypes: FUNGIBLE_ASSET_TYPES,
        forceUpdate: true,
      }),
    )
    .then(
      () => true,
      (error) => {
        log('Failed to load assets for account groups', { groupIds, error });
        return false;
      },
    );

  // Drop the loading state early if the fetch outlives the cap, while leaving
  // the fetch itself running: cancelling is not possible, and letting it settle
  // is what keeps a later retry from racing it.
  const timeoutId = setTimeout(() => {
    log('Account group asset fetch exceeded timeout', { groupIds });
    clearPending(groupIds);
  }, ACCOUNT_GROUP_ASSET_FETCH_TIMEOUT_MS);

  try {
    if (!(await succeeded)) {
      // Allow a later attempt to retry failed groups. Assets already committed
      // to state before the failure remain visible.
      for (const groupId of groupIds) {
        requestedGroupIds.delete(groupId);
      }
    }
  } finally {
    clearTimeout(timeoutId);
    clearPending(groupIds);
  }
}

/**
 * `loadAccountGroupAssets` for callers outside React, resolving accounts and
 * enabled chains from the store rather than from hook selectors.
 *
 * @param accountAddresses - Addresses whose account groups should be loaded.
 */
export async function loadAssetsForAddresses(
  accountAddresses: string[],
): Promise<void> {
  if (accountAddresses.length === 0) {
    return;
  }

  const state = ReduxService.store.getState() as RootState;

  const accountsByAddress = selectInternalAccountByAddresses(state);
  const accountToGroupMap = selectAccountToGroupMap(state);
  const getAccountsByGroupId = selectInternalAccountsByGroupId(state);

  const groupIds = new Set<string>();
  for (const account of accountsByAddress(accountAddresses)) {
    const groupId = accountToGroupMap[account.id]?.id;
    if (groupId) {
      groupIds.add(groupId);
    }
  }

  const groups = [...groupIds]
    .map((accountGroupId) => ({
      accountGroupId,
      accounts: getAccountsByGroupId(accountGroupId as AccountGroupId),
    }))
    .filter(({ accounts }) => accounts.length > 0);

  if (groups.length === 0) {
    return;
  }

  await loadAccountGroupAssets({
    groups,
    caipChainIds: selectEnabledCaipChainIds(state),
  });
}

function dedupeAccounts(accounts: InternalAccount[]): InternalAccount[] {
  const byId = new Map<string, InternalAccount>();

  for (const account of accounts) {
    if (!byId.has(account.id)) {
      byId.set(account.id, account);
    }
  }

  return [...byId.values()];
}

/** Test-only: clears session dedupe and pending state. */
export function resetAccountGroupAssetLoaderForTests() {
  requestedGroupIds.clear();
  pendingGroupIds.clear();
  listeners.clear();
}
