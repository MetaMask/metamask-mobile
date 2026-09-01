import {
  type ActivityListItem,
  getLocalTransactionMetaId,
} from '../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details route type; route-isolation backlog
import type { ActivityDetailsParams } from '../ActivityDetails/ActivityDetails.types';
import { stashPreloadedActivityItem } from './preloadedActivityItemStore';

function getLocalTransactionMetaIdFromItem(
  item: ActivityListItem,
): string | undefined {
  return getLocalTransactionMetaId(item);
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
  const localMetaId = getLocalTransactionMetaIdFromItem(item);
  const txIdentifier = localMetaId ?? item.hash;
  if (!txIdentifier) {
    return null;
  }

  const { raw } = item;
  const shouldPreload =
    Boolean(getLocalTransactionMetaIdFromItem(item)) ||
    raw?.type === 'perpsTransaction' ||
    raw?.type === 'predictActivity';
  const preloadKey = shouldPreload
    ? stashPreloadedActivityItem(item)
    : undefined;

  return {
    chainId: item.chainId,
    txIdentifier,
    ...(preloadKey ? { preloadKey } : {}),
  };
}
