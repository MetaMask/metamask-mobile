/**
 * Redux Saga for handling bulk linking of all account groups to Rewards.
 *
 * This saga runs independently of component lifecycle, allowing the bulk link
 * process to continue even when users navigate between screens.
 *
 * Key features:
 * - Survives navigation (runs at saga level, not component level)
 * - Processes accounts one-by-one for real-time progress updates
 * - Updates Redux state after each account for granular UI feedback
 * - Controls cache invalidation frequency to reduce overhead
 * - Supports cancellation
 * - Handles errors per-account (continues processing even if some fail)
 */
import {
  take,
  put,
  call,
  select,
  fork,
  cancelled,
  race,
} from 'redux-saga/effects';
import { InteractionManager } from 'react-native';
import { AccountGroupId } from '@metamask/account-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import {
  bulkLinkStarted,
  bulkLinkAccountResult,
  bulkLinkCompleted,
  bulkLinkCancelled,
  BULK_LINK_START,
  BULK_LINK_CANCEL,
} from '../../reducers/rewards';

// Re-export action types for backwards compatibility
export { BULK_LINK_START, BULK_LINK_CANCEL };
import { selectAccountGroups } from '../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsByGroupId } from '../../selectors/multichainAccounts/accounts';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { OptInStatusDto } from '../../core/Engine/controllers/rewards-controller/types';

/**
 * Action creator to start bulk link
 */
export const startBulkLink = () => ({
  type: BULK_LINK_START,
});

/**
 * Action creator to cancel bulk link
 */
export const cancelBulkLink = () => ({
  type: BULK_LINK_CANCEL,
});

/**
 * Yields control back to the UI thread to prevent freezing.
 * This allows React Native to process pending animations, gestures, and renders.
 */
function waitForInteractions(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

/**
 * Filter accounts to only those supported for opt-in
 */
function getSupportedAccounts(accounts: InternalAccount[]): InternalAccount[] {
  return accounts.filter((account) => {
    try {
      return Engine.controllerMessenger.call(
        'RewardsController:isOptInSupported',
        account,
      );
    } catch {
      return false;
    }
  });
}

/**
 * How often to trigger cache invalidation (every N accounts).
 * Balances between:
 * - Freshness of cached data (smaller = more frequent invalidations)
 * - Performance overhead (larger = fewer invalidations)
 */
const CACHE_INVALIDATION_INTERVAL = 100;

/**
 * How often to yield to UI thread (every N accounts).
 * Balances between:
 * - UI responsiveness (smaller = more responsive)
 * - Processing speed (larger = faster overall)
 */
const UI_YIELD_INTERVAL = 2;

/**
 * Abort if this many consecutive failures occur
 */
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Result of processing all accounts
 */
interface AccountLinkingResult {
  linkResultsByAddress: Map<string, boolean>;
}

// ============================================================================
// Helper Saga Functions
// ============================================================================

/**
 * Collects all supported accounts from groups.
 * Returns a flat list of all supported accounts.
 */
function collectAccountsFromGroups(
  groupsToProcess: readonly AccountGroupObject[],
  getAccountsByGroupId: (groupId: AccountGroupId) => InternalAccount[],
): {
  allSupportedAccounts: InternalAccount[];
} {
  const allSupportedAccounts: InternalAccount[] = [];

  for (const group of groupsToProcess) {
    const accounts = getAccountsByGroupId(group.id) || [];
    const supportedAccounts = getSupportedAccounts(accounts);
    allSupportedAccounts.push(...supportedAccounts);
  }

  return { allSupportedAccounts };
}

/**
 * Fetches opt-in status for all addresses in a single batch call.
 * Returns a map of address -> isOptedIn for O(1) lookups.
 */
function* fetchBatchOptInStatus(
  allSupportedAccounts: InternalAccount[],
): Generator<unknown, Map<string, boolean>> {
  const optInStatusMap = new Map<string, boolean>();
  const allAddresses = allSupportedAccounts.map((account) => account.address);

  if (allAddresses.length === 0) {
    return optInStatusMap;
  }

  Logger.log(
    `Bulk link: Fetching opt-in status for ${allAddresses.length} addresses`,
  );

  const optInResponse = (yield call(
    [Engine.controllerMessenger, Engine.controllerMessenger.call],
    'RewardsController:getOptInStatus',
    { addresses: allAddresses },
  )) as OptInStatusDto;

  // Build address -> optInStatus map for O(1) lookups
  allAddresses.forEach((address, index) => {
    optInStatusMap.set(address, optInResponse.ois[index] === true);
  });

  Logger.log(
    `Bulk link: Opt-in status fetched - ${optInResponse.ois.filter(Boolean).length} already opted in, ${optInResponse.ois.filter((v) => !v).length} need linking`,
  );

  return optInStatusMap;
}

/**
 * Collects all accounts that need linking from all groups.
 */
function collectAccountsToLink(
  allSupportedAccounts: InternalAccount[],
  optInStatusMap: Map<string, boolean>,
): InternalAccount[] {
  return allSupportedAccounts.filter(
    (account) => !optInStatusMap.get(account.address),
  );
}

/**
 * Links a single account and returns whether it was successful.
 *
 * @param account - The account to link
 * @param invalidateRelatedData - Whether to invalidate cache and emit events after linking
 */
function* linkSingleAccount(
  account: InternalAccount,
  invalidateRelatedData: boolean,
): Generator<unknown, boolean> {
  try {
    const success = (yield call(
      [Engine.controllerMessenger, Engine.controllerMessenger.call],
      'RewardsController:linkAccountToSubscriptionCandidate',
      account,
      invalidateRelatedData,
    )) as boolean;
    return success;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.log(
      `Bulk link: Failed to link account ${account.address}`,
      errorMessage,
    );
    return false;
  }
}

/**
 * Marks remaining accounts as failed when aborting early.
 */
function* markRemainingAccountsAsFailed(
  allAccountsToLink: InternalAccount[],
  startIndex: number,
  linkResultsByAddress: Map<string, boolean>,
): Generator {
  for (let j = startIndex; j < allAccountsToLink.length; j++) {
    linkResultsByAddress.set(allAccountsToLink[j].address, false);
    yield put(bulkLinkAccountResult({ success: false }));
  }
}

/**
 * Processes all accounts one-by-one with progress updates and cache invalidation.
 */
function* processAllAccounts(
  allAccountsToLink: InternalAccount[],
): Generator<unknown, AccountLinkingResult> {
  const linkResultsByAddress = new Map<string, boolean>();
  let consecutiveFailures = 0;

  if (allAccountsToLink.length === 0) {
    Logger.log('Bulk link: No accounts need linking (all already opted in)');
    return { linkResultsByAddress };
  }

  const totalAccounts = allAccountsToLink.length;

  for (let i = 0; i < totalAccounts; i++) {
    const account = allAccountsToLink[i];
    const accountNumber = i + 1; // 1-indexed
    const isLastAccount = accountNumber === totalAccounts;

    // Determine if we should invalidate cache on this account:
    // - Every CACHE_INVALIDATION_INTERVAL accounts to keep data fresh
    // - On the last account to ensure final state is correct
    const shouldInvalidate =
      isLastAccount || accountNumber % CACHE_INVALIDATION_INTERVAL === 0;

    const success = (yield* linkSingleAccount(
      account,
      shouldInvalidate,
    )) as boolean;

    if (success) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
    }

    // Abort early if too many consecutive failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      Logger.log(
        `Bulk link: ${MAX_CONSECUTIVE_FAILURES} consecutive failures, aborting`,
      );
      linkResultsByAddress.set(account.address, success);
      yield put(bulkLinkAccountResult({ success }));
      yield* markRemainingAccountsAsFailed(
        allAccountsToLink,
        i + 1,
        linkResultsByAddress,
      );
      break;
    }

    // Track result and update Redux for real-time UI progress
    linkResultsByAddress.set(account.address, success);
    yield put(bulkLinkAccountResult({ success }));

    // Yield to UI every N accounts to prevent freezing
    if (accountNumber % UI_YIELD_INTERVAL === 0) {
      yield call(waitForInteractions);
    }
  }

  const totalLinked = Array.from(linkResultsByAddress.values()).filter(
    Boolean,
  ).length;
  const totalFailed = totalAccounts - totalLinked;
  Logger.log(
    `Bulk link: All accounts processed - ${totalLinked} succeeded, ${totalFailed} failed out of ${totalAccounts} total`,
  );

  return { linkResultsByAddress };
}

// ============================================================================
// Main Worker Saga
// ============================================================================

/**
 * Main bulk link worker saga.
 * Orchestrates the bulk linking process by delegating to helper functions.
 */
function* bulkLinkWorker(): Generator {
  try {
    // Get all account groups
    const accountGroups = (yield select(
      selectAccountGroups,
    )) as readonly AccountGroupObject[];
    const getAccountsByGroupId = (yield select(
      selectInternalAccountsByGroupId,
    )) as (groupId: AccountGroupId) => InternalAccount[];

    // Filter to groups that have accounts
    const groupsToProcess = accountGroups.filter((group) => {
      const accounts = getAccountsByGroupId(group.id);
      return accounts?.length > 0;
    });

    if (groupsToProcess.length === 0) {
      Logger.log('Bulk link: No account groups to process');
      return;
    }

    const startTime = Date.now();
    Logger.log(
      `Bulk link: Starting process for ${groupsToProcess.length} account groups at ${new Date(startTime).toISOString()}`,
    );

    // Step 1: Collect all supported accounts from all groups
    const { allSupportedAccounts } = collectAccountsFromGroups(
      groupsToProcess,
      getAccountsByGroupId,
    );

    // Step 2: Batch fetch opt-in status for all addresses
    const optInStatusMap = (yield* fetchBatchOptInStatus(
      allSupportedAccounts,
    )) as Map<string, boolean>;

    // Step 3: Identify accounts that need linking
    const allAccountsToLink = collectAccountsToLink(
      allSupportedAccounts,
      optInStatusMap,
    );

    // Initialize progress state
    yield put(
      bulkLinkStarted({
        totalAccounts: allAccountsToLink.length,
      }),
    );

    Logger.log(
      `Bulk link: Will process ${allAccountsToLink.length} accounts one-by-one (cache invalidation every ${CACHE_INVALIDATION_INTERVAL}, UI yield every ${UI_YIELD_INTERVAL})`,
    );

    // Yield to UI before the heavy operation
    yield call(waitForInteractions);

    // Step 4: Process all accounts one-by-one
    const { linkResultsByAddress } = (yield* processAllAccounts(
      allAccountsToLink,
    )) as AccountLinkingResult;

    // Log completion stats
    const endTime = Date.now();
    const elapsedMs = endTime - startTime;
    const elapsedSec = (elapsedMs / 1000).toFixed(2);
    const successCount = Array.from(linkResultsByAddress.values()).filter(
      Boolean,
    ).length;
    const failedCount = allAccountsToLink.length - successCount;
    Logger.log(
      `Bulk link: Process completed at ${new Date(endTime).toISOString()} - Total time: ${elapsedSec}s (${elapsedMs}ms)`,
    );
    Logger.log(
      `Bulk link: Results - ${successCount} accounts succeeded, ${failedCount} accounts failed, ${allAccountsToLink.length} total`,
    );
    yield put(bulkLinkCompleted());
  } catch (error) {
    Logger.error(error as Error, { message: 'Bulk link saga error' });
    yield put(bulkLinkCompleted());
  } finally {
    // Handle cancellation
    if (yield cancelled()) {
      Logger.log('Bulk link: Process was cancelled');
      yield put(bulkLinkCancelled());
    }
  }
}

/**
 * Watcher saga that listens for bulk link start actions.
 * Supports cancellation via BULK_LINK_CANCEL action.
 */
export function* watchBulkLink(): Generator {
  while (true) {
    // Wait for start action
    yield take(BULK_LINK_START);

    // Race between the worker completing and a cancel action
    yield race({
      task: call(bulkLinkWorker),
      cancel: take(BULK_LINK_CANCEL),
    });
  }
}

/**
 * Root saga for rewards bulk link.
 * Fork this from the main rootSaga to enable bulk link functionality.
 */
export function* rewardsBulkLinkSaga(): Generator {
  yield fork(watchBulkLink);
}

export default rewardsBulkLinkSaga;
