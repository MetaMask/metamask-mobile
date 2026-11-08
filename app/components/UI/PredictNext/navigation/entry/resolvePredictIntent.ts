import { getPredictCampaignVenue } from '../../campaigns/campaignVenues';
import type {
  PredictConfiguredVenue,
  PredictImplementationResolution,
} from '../../implementation';
import { getVenueImplementation } from '../../implementation/venueImplementations';
import type { PredictIntent } from './intents';
import {
  resolveLegacyIntent,
  type LegacyLinkFeedContext,
} from './internal/legacy/resolveLegacyIntent';
import { resolveNextIntent } from './internal/next/resolveNextIntent';
import { unavailable, type PredictIntentResolution } from './targets';

/** Whether the implementation serving the Active Venue serves `venue`. */
export const servesVenue = (
  implementation: Extract<PredictImplementationResolution, { status: 'ready' }>,
  venue: PredictConfiguredVenue,
): boolean =>
  implementation.implementation === 'legacy'
    ? getVenueImplementation(venue) === 'legacy'
    : implementation.venueId === venue;

/**
 * Resolves an intent against the implementation serving the Active Venue.
 *
 * While the Active Venue is resolving, Home and feeds take today's legacy
 * navigation: the root router mounts the Active Venue's stack once it is
 * known, and the PredictNext stack then opens at Home, which is where both
 * intents resolve on that branch too. Every other intent depends on the
 * Venue and opens nothing until it is known. So does an intent a campaign
 * opens: it belongs to the campaign's Venue, and opens nothing on another.
 * A V1 link's list parameters behave like a feed. `legacyLinkFeeds` carries
 * the legacy flags they depend on.
 */
export const resolvePredictIntent = (
  intent: PredictIntent,
  implementation: PredictImplementationResolution,
  legacyLinkFeeds?: LegacyLinkFeedContext,
): PredictIntentResolution => {
  const campaign = intent.type === 'home' ? intent.campaign : undefined;
  if (implementation.status === 'resolving') {
    return (intent.type === 'home' && campaign === undefined) ||
      intent.type === 'feed' ||
      intent.type === 'linkList'
      ? resolveLegacyIntent(intent, legacyLinkFeeds)
      : unavailable('resolving');
  }
  if (
    campaign !== undefined &&
    !servesVenue(implementation, getPredictCampaignVenue(campaign))
  ) {
    return unavailable('venueMismatch');
  }
  return implementation.implementation === 'legacy'
    ? resolveLegacyIntent(intent, legacyLinkFeeds)
    : resolveNextIntent(intent, implementation.venueId);
};
