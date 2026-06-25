import type { ActivityListItem } from '../../../util/activity-adapters';

/**
 * Transient, in-memory hand-off for provider-backed Activity rows (Perps /
 * Predict) that can't be re-resolved by hash outside their source/provider tree.
 *
 * The row is stashed here right before navigating to ActivityDetails so that
 * navigation params stay serializable (only `chainId` + `txIdentifier`) — large
 * row objects never enter the navigation state.
 *
 * Intentionally NOT persisted: on a cold start / state restoration the store is
 * empty and the details screen falls back to its normal by-identifier
 * resolution, which is the not-found state for provider-backed rows — the same
 * limitation that motivated the hand-off in the first place.
 */
const keyOf = (chainId?: string, txIdentifier?: string): string =>
  `${chainId ?? ''}:${txIdentifier?.toLowerCase() ?? ''}`;

const preloadedItems = new Map<string, ActivityListItem>();

/** Stash a provider-backed row (keyed by chain + hash) before navigating. */
export function setPreloadedActivityItem(item: ActivityListItem): void {
  if (!item.hash) {
    return;
  }
  preloadedItems.set(keyOf(item.chainId, item.hash), item);
}

/** Retrieve a previously-stashed row for the ActivityDetails screen. */
export function getPreloadedActivityItem(
  chainId?: string,
  txIdentifier?: string,
): ActivityListItem | undefined {
  return preloadedItems.get(keyOf(chainId, txIdentifier));
}
