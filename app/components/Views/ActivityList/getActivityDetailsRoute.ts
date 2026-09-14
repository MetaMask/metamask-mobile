import type { ActivityListItem } from '../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details route type; route-isolation backlog
import type { ActivityDetailsParams } from '../ActivityDetails/ActivityDetails.types';

/**
 * Route params for the redesigned `ActivityDetails` screen, or `null` when the
 * row has no stable identifier — callers then fall back to their legacy detail
 * flow. Shared so every list routes identically.
 *
 * Uses `item.hash`. `mapLocalTransaction` already sets that to `TransactionMeta.id`
 * when there is no on-chain hash yet (pending / STX). Details rematch live
 * sources by that identifier.
 */
export function getActivityDetailsRoute(
  item: ActivityListItem,
): ActivityDetailsParams | null {
  const txIdentifier = item.hash;
  if (!txIdentifier) {
    return null;
  }

  return {
    chainId: item.chainId,
    txIdentifier,
  };
}
