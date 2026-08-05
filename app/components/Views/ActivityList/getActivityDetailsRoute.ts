import type { ActivityListItem } from '../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details route type; route-isolation backlog
import type { ActivityDetailsParams } from '../ActivityDetails/ActivityDetails.types';
import { stashPreloadedActivityItem } from './preloadedActivityItemStore';

function getLocalTransactionMetaId(item: ActivityListItem): string | undefined {
  if (item.raw?.type !== 'localTransaction') {
    return undefined;
  }
  return item.raw.data.primaryTransaction?.id;
}

/**
 * Route params for the redesigned `ActivityDetails` screen, or `null` when the
 * row has no stable identifier — callers then fall back to their legacy detail
 * flow. Shared so every list routes identically.
 *
 * Local EVM rows use `TransactionMeta.id` rather than the hash, which can change
 * on STX submission, and are stashed in `preloadedActivityItemStore` so Details
 * can recover if the live hash diverges. Provider-backed rows (Perps/Predict)
 * are stashed too, so call this only when about to navigate.
 */
export function getActivityDetailsRoute(
  item: ActivityListItem,
): ActivityDetailsParams | null {
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
