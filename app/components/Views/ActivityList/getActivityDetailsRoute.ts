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
 * Resolves the params for navigating a row to the redesigned `ActivityDetails`
 * screen, or `null` when the row can't be shown there yet — it has no hash
 * (e.g. a pending local tx), or it has a dedicated screen (bridge). Callers
 * navigate with the returned params and fall back to their legacy detail flow
 * when this returns `null`.
 *
 * Shared by the Activity list and the per-asset activity lists so every entry
 * point makes the same routing decision (incl. stashing provider-backed rows
 * — Perps / Predict — that can't be re-resolved by hash).
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
