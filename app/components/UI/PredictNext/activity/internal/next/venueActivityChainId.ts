import type { CaipChainId } from '@metamask/utils';
import { KALSHI_VENUE_CHAIN_ID } from '../../../../../../util/activity-adapters';
import type { PredictVenueId } from '../../../types';

/**
 * The `chainId` each Venue's Activity carries in shared Activity. Kalshi has
 * no chain, so its rows use a venue key that only keys the details source,
 * never Polygon or any real chain. A Venue without an entry has no Activity
 * in shared Activity yet.
 */
const VENUE_ACTIVITY_CHAIN_IDS: ReadonlyMap<string, CaipChainId> = new Map([
  ['kalshi', KALSHI_VENUE_CHAIN_ID],
]);

export const getVenueActivityChainId = (
  venueId: PredictVenueId | undefined,
): CaipChainId | undefined =>
  venueId === undefined ? undefined : VENUE_ACTIVITY_CHAIN_IDS.get(venueId);
