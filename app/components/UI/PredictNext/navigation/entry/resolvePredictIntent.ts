import type { PredictImplementationResolution } from '../../implementation';
import type { PredictIntent } from './intents';
import { resolveLegacyIntent } from './internal/legacy/resolveLegacyIntent';
import { resolveNextIntent } from './internal/next/resolveNextIntent';
import { unavailable, type PredictIntentResolution } from './targets';

/**
 * Resolves an intent against the implementation serving the Active Venue.
 *
 * While the Active Venue is resolving, Home and feeds take today's legacy
 * navigation: the root router mounts the Active Venue's stack once it is
 * known, and the PredictNext stack then opens at Home, which is where both
 * intents resolve on that branch too. Until the root router's Polymarket
 * pinning is retired, a feed's legacy `tab` parameter pins that entry to
 * Polymarket instead, as feed entries are pinned today. Every other intent
 * depends on the Venue and opens nothing until it is known.
 */
export const resolvePredictIntent = (
  intent: PredictIntent,
  implementation: PredictImplementationResolution,
): PredictIntentResolution => {
  if (implementation.status === 'resolving') {
    return intent.type === 'home' || intent.type === 'feed'
      ? resolveLegacyIntent(intent)
      : unavailable('resolving');
  }
  return implementation.implementation === 'legacy'
    ? resolveLegacyIntent(intent)
    : resolveNextIntent(intent, implementation.venueId);
};
