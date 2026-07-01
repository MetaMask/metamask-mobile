import { TransactionType } from '@metamask/transaction-controller';
import type { ActivityListItem } from '../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details route type; route-isolation backlog
import type { ActivityDetailsParams } from '../ActivityDetails/ActivityDetails.types';
import { stashPreloadedActivityItem } from './preloadedActivityItemStore';

/**
 * Bridge rows keep their dedicated bridge-status screen rather than routing to
 * the generic ActivityDetails screen.
 */
function hasDedicatedDetailScreen(item: ActivityListItem): boolean {
  const { raw } = item;
  return (
    raw?.type === 'localTransaction' &&
    raw.data.primaryTransaction?.type === TransactionType.bridge
  );
}

/**
 * Route params for opening a row in the redesigned `ActivityDetails` screen, or
 * `null` when it can't be shown there (no hash, or a bridge tx with its own
 * screen) — callers then fall back to their legacy detail flow. Shared so the
 * Activity list and per-asset lists route identically.
 *
 * Side effect: stashes provider-backed rows (Perps/Predict) into
 * `preloadedActivityItemStore`, so call it only when about to navigate.
 */
export function getActivityDetailsRoute(
  item: ActivityListItem,
): ActivityDetailsParams | null {
  if (!item.hash || hasDedicatedDetailScreen(item)) {
    return null;
  }

  const { raw } = item;
  const preloadKey =
    raw?.type === 'perpsTransaction' || raw?.type === 'predictActivity'
      ? stashPreloadedActivityItem(item)
      : undefined;

  return {
    chainId: item.chainId,
    txIdentifier: item.hash,
    ...(preloadKey ? { preloadKey } : {}),
  };
}
