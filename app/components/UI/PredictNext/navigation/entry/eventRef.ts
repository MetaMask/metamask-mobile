import {
  getPredictCampaignVenue,
  type PredictCampaign,
  type PredictCampaignVenue,
} from '../../campaigns/campaignVenues';
import type { PredictConfiguredVenue } from '../../implementation';
import type { PredictEntityId } from '../../types';

declare const predictEventRefVenue: unique symbol;

/**
 * An opaque, Venue-qualified reference to one Event. Only Predict mints it,
 * so a caller can hold and pass one but never build or read one: it never
 * learns a Venue's identifier shape. The Venue is part of the type, so a
 * Polymarket reference is not assignable where a Kalshi one is expected.
 */
export interface PredictEventRef<
  TVenue extends PredictConfiguredVenue = PredictConfiguredVenue,
> {
  readonly [predictEventRefVenue]: TVenue;
}

/** A Venue the PredictNext implementation serves. */
export type PredictNextVenue = Exclude<PredictConfiguredVenue, 'polymarket'>;

/**
 * What a reference holds, by the implementation that serves its Venue. The
 * legacy shape is the one the legacy market details screen takes; it goes
 * with the legacy branch (PRED-1356).
 */
export type PredictEventRefData =
  | {
      implementation: 'legacy';
      venue: 'polymarket';
      marketId: string;
      providerId: string;
    }
  | {
      implementation: 'next';
      venue: PredictNextVenue;
      eventId: PredictEntityId;
    };

const mint = <TVenue extends PredictConfiguredVenue>(
  data: PredictEventRefData,
): PredictEventRef<TVenue> =>
  Object.freeze({ ...data }) as unknown as PredictEventRef<TVenue>;

/**
 * Mints a reference to a market that legacy Polymarket code produced, for a
 * caller that still receives legacy data (Browser autocomplete). Transitional:
 * it goes when those producers become Predict-owned (PRED-1356).
 */
export const createLegacyPredictEventRef = ({
  marketId,
  providerId,
}: {
  marketId: string;
  providerId: string;
}): PredictEventRef<'polymarket'> =>
  mint({ implementation: 'legacy', venue: 'polymarket', marketId, providerId });

/**
 * Mints a reference to an Event that a Rewards campaign's backend names. The
 * campaign decides the Venue, so a campaign's identifier only ever becomes a
 * reference on that campaign's Venue, and the reference's type says which.
 * Every campaign runs on Polymarket, which the legacy implementation serves,
 * where the provider ID is the Venue ID. PRED-1356 changes the shape it mints.
 */
export const createPredictCampaignEventRef = (
  campaign: PredictCampaign,
  eventId: string,
): PredictEventRef<PredictCampaignVenue> => {
  const venue = getPredictCampaignVenue(campaign);
  return mint({
    implementation: 'legacy',
    venue,
    marketId: eventId,
    providerId: venue,
  });
};

/** Mints a reference to a canonical Event served by PredictNext. */
export const createNextPredictEventRef = <TVenue extends PredictNextVenue>(
  venue: TVenue,
  eventId: PredictEntityId,
): PredictEventRef<TVenue> => mint({ implementation: 'next', venue, eventId });

/** Reads a reference. Internal to Predict: callers never see its data. */
export const readPredictEventRef = (
  eventRef: PredictEventRef,
): PredictEventRefData => eventRef as unknown as PredictEventRefData;
