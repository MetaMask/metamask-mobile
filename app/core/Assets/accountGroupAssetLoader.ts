import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  createProjectLogger,
  type CaipChainId,
  type Hex,
} from '@metamask/utils';
import type { AssetType as AssetsControllerAssetType } from '@metamask/assets-controller';
import Engine from '../Engine';

const log = createProjectLogger('account-group-asset-loader');

/** Matches the homepage token list: native + ERC-20 / SPL fungibles. */
const FETCH_ASSET_TYPES: AssetsControllerAssetType[] = ['fungible'];

/**
 * Safety cap so a hung data source cannot pin a surface in a loading state
 * forever. Mirrors the 5s cap used by the wallet balance refresh helpers.
 */
export const ACCOUNT_GROUP_ASSET_FETCH_TIMEOUT_MS = 5000;

/** One account group's accounts, as resolved by the caller. */
export interface AccountGroupAssetRequest {
  accountGroupId: string;
  accounts: InternalAccount[];
}

export interface LoadAccountGroupAssetsParams {
  groups: AccountGroupAssetRequest[];
  /** CAIP-2 chain IDs to fetch (unified assets state path). */
  caipChainIds: CaipChainId[];
  /** Hex EVM chain IDs to fetch (legacy path). */
  evmChainIds: Hex[];
  isAssetsUnifyStateEnabled: boolean;
}

/**
 * Account groups whose assets have been requested at least once this session.
 *
 * Loads are cached per session rather than per mount: assets land in controller
 * state, so once a group has been fetched the ordinary selectors keep serving
 * it. Re-fetching on every mount would add latency for no benefit.
 */
const requestedGroupIds = new Set<string>();

/** Groups with a fetch currently in flight. */
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

function withTimeout(promise: Promise<unknown>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout>;

  return Promise.race([
    promise,
    new Promise((_resolve, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Account group asset fetch timed out')),
        timeoutMs,
      );
    }),
  ]).finally(() => clearTimeout(timeoutId));
}

/**
 * Fetch assets for account groups the app has never loaded.
 *
 * `AssetsController` (and, on the legacy path, the balance/detection
 * controllers) only ever fetch for the *selected* account group: every
 * automatic path resolves accounts through
 * `AccountTreeController:getAccountsFromSelectedAccountGroup`. A group the user
 * has never activated therefore has no entry in assets state, so both
 * `selectAssetsByAccountGroupId` and `selectBalanceByAccountGroup` report
 * empty/zero — indistinguishable from an genuinely empty account. Surfaces that
 * show assets or balances for non-selected accounts (the MM Pay "Pay with"
 * token list, the MM Pay account selector list) must request the data.
 *
 * Groups already requested this session are skipped, and all remaining groups
 * are fetched in a single batched controller call.
 *
 * @param params - Fetch parameters.
 * @param params.groups - Account groups to load, with their resolved accounts.
 * @param params.caipChainIds - CAIP-2 chain IDs to fetch (unified path).
 * @param params.evmChainIds - Hex EVM chain IDs to fetch (legacy path).
 * @param params.isAssetsUnifyStateEnabled - Whether unified assets state is on.
 */
export async function loadAccountGroupAssets({
  groups,
  caipChainIds,
  evmChainIds,
  isAssetsUnifyStateEnabled,
}: LoadAccountGroupAssetsParams): Promise<void> {
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

  try {
    await withTimeout(
      fetchAssets({
        accounts,
        caipChainIds,
        evmChainIds,
        isAssetsUnifyStateEnabled,
      }),
      ACCOUNT_GROUP_ASSET_FETCH_TIMEOUT_MS,
    );
  } catch (error) {
    // Allow a later attempt to retry failed/timed-out groups. Assets already
    // committed to state before the failure remain visible.
    for (const groupId of groupIds) {
      requestedGroupIds.delete(groupId);
    }
    log('Failed to load assets for account groups', { groupIds, error });
  } finally {
    for (const groupId of groupIds) {
      pendingGroupIds.delete(groupId);
    }
    emit();
  }
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

async function fetchAssets({
  accounts,
  caipChainIds,
  evmChainIds,
  isAssetsUnifyStateEnabled,
}: {
  accounts: InternalAccount[];
  caipChainIds: CaipChainId[];
  evmChainIds: Hex[];
  isAssetsUnifyStateEnabled: boolean;
}) {
  const {
    AssetsController,
    AccountTrackerController,
    TokenBalancesController,
    TokenDetectionController,
    MultichainBalancesController,
  } = Engine.context;

  if (isAssetsUnifyStateEnabled) {
    if (caipChainIds.length === 0) {
      return;
    }

    await AssetsController.getAssets(accounts, {
      chainIds: caipChainIds,
      assetTypes: FETCH_ASSET_TYPES,
      forceUpdate: true,
    });

    return;
  }

  // Legacy path: the EVM controllers are keyed by address, and non-EVM
  // balances are fetched per account id.
  const evmAddresses = accounts
    .filter((account) => account.address.startsWith('0x'))
    .map((account) => account.address);

  const nonEvmAccountIds = accounts
    .filter((account) => !account.address.startsWith('0x'))
    .map((account) => account.id);

  const tasks: Promise<unknown>[] = nonEvmAccountIds.map((accountId) =>
    MultichainBalancesController.updateBalance(accountId),
  );

  if (evmAddresses.length > 0 && evmChainIds.length > 0) {
    const networkClientIds = getNetworkClientIds(evmChainIds);

    if (networkClientIds.length > 0) {
      tasks.push(
        AccountTrackerController.refreshAddresses({
          networkClientIds,
          addresses: evmAddresses,
        }),
      );
    }

    tasks.push(
      // `queryAllAccounts` is required: without it these controllers narrow to
      // the selected account and the requested accounts are never fetched.
      TokenBalancesController.updateBalances({
        chainIds: evmChainIds,
        queryAllAccounts: true,
      }),
      ...evmAddresses.map((address) =>
        TokenDetectionController.detectTokens({
          chainIds: evmChainIds,
          selectedAddress: address,
        }),
      ),
    );
  }

  const results = await Promise.allSettled(tasks);

  for (const result of results) {
    if (result.status === 'rejected') {
      log('Account group asset fetch task failed', result.reason);
    }
  }
}

function getNetworkClientIds(evmChainIds: Hex[]): string[] {
  const { NetworkController } = Engine.context;

  return evmChainIds
    .map((chainId) => {
      try {
        return NetworkController.findNetworkClientIdByChainId(chainId);
      } catch {
        // Chain not configured — skip it.
        return undefined;
      }
    })
    .filter((id): id is string => Boolean(id));
}

/** Test-only: clears session dedupe and pending state. */
export function resetAccountGroupAssetLoaderForTests() {
  requestedGroupIds.clear();
  pendingGroupIds.clear();
  listeners.clear();
}
