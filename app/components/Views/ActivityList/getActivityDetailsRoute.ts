import type { ActivityListItem } from '../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details route type; route-isolation backlog
import type { ActivityDetailsParams } from '../ActivityDetails/ActivityDetails.types';

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
 * on STX submission. Details rematch live sources by that identifier.
 */
export function getActivityDetailsRoute(
  item: ActivityListItem,
): ActivityDetailsParams | null {
  const txIdentifier = getLocalTransactionMetaId(item) ?? item.hash;
  if (!txIdentifier) {
    return null;
  }

  return {
    chainId: item.chainId,
    txIdentifier,
  };
}
