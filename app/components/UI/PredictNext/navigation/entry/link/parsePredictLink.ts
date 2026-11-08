import type { PredictConfiguredVenue } from '../../../implementation';
import type { PredictEntityId } from '../../../types';
import {
  createLegacyPredictEventRef,
  createNextPredictEventRef,
} from '../eventRef';
import type { PredictIntent, PredictLinkEntryPoint } from '../intents';

/**
 * A V1 Predict link, parsed into the intent it opens. Predict owns the
 * parse because only Predict mints Event references.
 */
export interface PredictLink {
  /**
   * The Venue the link names with `venue=`, or `null` when it names none.
   * An unmarked link is a V1 Polymarket link: its entity identifiers are
   * Polymarket's. The Venue is never guessed from an identifier.
   */
  venue: PredictConfiguredVenue | null;
  /**
   * What the link opens, or `null` when it names nothing this build can
   * open: an unknown `venue`, or a Kalshi `market` ticker (there is no
   * market-to-Event lookup). Either opens the bounded not-found.
   */
  intent: PredictIntent | null;
}

const LINK_VENUES: readonly PredictConfiguredVenue[] = ['polymarket', 'kalshi'];

const isLinkVenue = (value: string): value is PredictConfiguredVenue =>
  (LINK_VENUES as readonly string[]).includes(value);

/** Everything after the first `?`, up to the next one, as before. */
const readQuery = (predictPath: string): URLSearchParams =>
  new URLSearchParams(
    predictPath.includes('?') ? predictPath.split('?')[1] : '',
  );

const nonEmpty = (value: string | null | undefined): string | undefined =>
  value || undefined;

/**
 * The link's origin (`deeplink` when it has none), with `_<utm_source>`
 * appended when the link carries a different `utm_source`. Unchanged from
 * the pre-intent handler, so dashboards keep their values.
 */
const toEntryPoint = (
  origin: string | undefined,
  utmSource: string | undefined,
): PredictLinkEntryPoint => {
  const base = origin || 'deeplink';
  return (
    utmSource && utmSource !== base ? `${base}_${utmSource}` : base
  ) as PredictLinkEntryPoint;
};

const polymarketEvent = (
  marketId: string,
  entryPoint: PredictLinkEntryPoint,
): PredictIntent => ({
  type: 'event',
  eventRef: createLegacyPredictEventRef({ marketId, providerId: 'polymarket' }),
  entryPoint,
});

/** Today's Polymarket vocabulary: `market`/`marketId`, else list params. */
const parsePolymarketIntent = (
  params: URLSearchParams,
  entryPoint: PredictLinkEntryPoint,
): PredictIntent => {
  const marketId =
    nonEmpty(params.get('market')) ?? nonEmpty(params.get('marketId'));
  if (marketId) {
    return polymarketEvent(marketId, entryPoint);
  }
  return {
    type: 'linkList',
    feed: nonEmpty(params.get('feed')?.toLowerCase()),
    tab: nonEmpty(params.get('tab')?.toLowerCase()),
    filter: nonEmpty(params.get('filter')?.toLowerCase()),
    query: nonEmpty(params.get('query')) ?? nonEmpty(params.get('q')),
    entryPoint,
  };
};

/** `event`, else `feed` (+ `tab`), else Home. A `market` is not found. */
const parseKalshiIntent = (
  params: URLSearchParams,
  entryPoint: PredictLinkEntryPoint,
): PredictIntent | null => {
  const eventId = nonEmpty(params.get('event'));
  if (eventId) {
    return {
      type: 'event',
      eventRef: createNextPredictEventRef('kalshi', eventId as PredictEntityId),
      entryPoint,
    };
  }
  if (nonEmpty(params.get('market')) || nonEmpty(params.get('marketId'))) {
    return null;
  }
  const feedScreenId = nonEmpty(params.get('feed'));
  if (feedScreenId) {
    return {
      type: 'feedScreen',
      feedScreenId,
      tabId: nonEmpty(params.get('tab')),
      entryPoint,
    };
  }
  return { type: 'home', entryPoint };
};

/**
 * Parses a V1 Predict link: the part of the URL after `/predict`. Pure; it
 * reads no state and looks nothing up.
 *
 * No `venue` is a V1 Polymarket link, read exactly as before.
 * `venue=polymarket` takes the same vocabulary, and also reads `event` as the
 * Polymarket market ID. `venue=kalshi` takes `event=<ticker>`,
 * `feed=<Feed Screen>` (+ `tab`), or nothing for Home. Any other `venue`
 * opens nothing (not found).
 *
 * Every intent carries the link's entry point, which holds its `utm_source`.
 */
export const parsePredictLink = ({
  predictPath,
  origin,
}: {
  predictPath: string;
  origin?: string;
}): PredictLink => {
  const params = readQuery(predictPath);
  const entryPoint = toEntryPoint(origin, nonEmpty(params.get('utm_source')));
  const marker = params.get('venue')?.toLowerCase();

  if (!marker) {
    return { venue: null, intent: parsePolymarketIntent(params, entryPoint) };
  }
  if (!isLinkVenue(marker)) {
    return { venue: null, intent: null };
  }
  if (marker === 'polymarket') {
    const eventId = nonEmpty(params.get('event'));
    return {
      venue: marker,
      intent: eventId
        ? polymarketEvent(eventId, entryPoint)
        : parsePolymarketIntent(params, entryPoint),
    };
  }
  return { venue: marker, intent: parseKalshiIntent(params, entryPoint) };
};
