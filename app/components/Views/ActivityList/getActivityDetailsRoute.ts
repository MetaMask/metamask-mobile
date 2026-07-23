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

function getLocalTransactionMetaId(item: ActivityListItem): string | undefined {
  if (item.raw?.type !== 'localTransaction') {
    return undefined;
  }
  return item.raw.data.primaryTransaction?.id;
}

/**
 * Route params for opening a row in the redesigned `ActivityDetails` screen, or
 * `null` when it can't be shown there (no stable identifier, or a bridge tx with
 * its own screen) — callers then fall back to their legacy detail flow. Shared
 * so the Activity list and per-asset lists route identically.
 *
 * Local EVM rows navigate by `TransactionMeta.id` (stable across STX hash
 * assignment) and are stashed in `preloadedActivityItemStore` so Details can
 * recover if the live hash temporarily diverges. Provider-backed rows
 * (Perps/Predict) are also stashed. Call only when about to navigate.
 */
export function getActivityDetailsRoute(
  item: ActivityListItem,
): ActivityDetailsParams | null {
  if (hasDedicatedDetailScreen(item)) {
    return null;
  }

  const localMetaId = getLocalTransactionMetaId(item);
  const txIdentifier = localMetaId ?? item.hash;
  if (!txIdentifier) {
    return null;
  }

  const { raw } = item;
  const shouldPreload =
    raw?.type === 'perpsTransaction' ||
    raw?.type === 'predictActivity' ||
    raw?.type === 'localTransaction';
  const preloadKey = shouldPreload
    ? stashPreloadedActivityItem(item)
    : undefined;

  return {
    chainId: item.chainId,
    txIdentifier,
    ...(preloadKey ? { preloadKey } : {}),
  };
}
