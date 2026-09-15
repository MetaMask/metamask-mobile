import type { ActivityListItem } from '../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity-details route type; route-isolation backlog
import type { ActivityDetailsParams } from '../ActivityDetails/ActivityDetails.types';

/**
 * ActivityDetails route, or null if the row has no hash. Uses `item.hash`.
 * Pending locals with no on-chain hash already have that set to the meta id.
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
