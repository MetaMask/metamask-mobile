import type {
  PredictMarket,
  PredictOutcome,
} from '../../../../../UI/Predict/types';
import { NBA_2026_CHAMPION_POLYMARKET_EVENT_ID } from '../constants/homepageNbaChampionDiscovery';
import Logger from '../../../../../../util/Logger';

/**
 * Pick the open outcome with the highest implied "Yes" price (`tokens[0].price`).
 * Used to narrow event-aggregate markets like "NBA Champion" — one outcome per
 * team — without relying on the API's incoming sort order.
 */
function pickHighestProbabilityOpenOutcome(
  market: Pick<PredictMarket, 'outcomes'>,
): PredictOutcome | undefined {
  const open = market.outcomes.filter(
    (o) => o.status === 'open' && o.tokens?.[0],
  );
  if (open.length === 0) {
    return undefined;
  }
  return open.reduce((best, candidate) => {
    const bestPrice = best.tokens[0]?.price ?? 0;
    const candidatePrice = candidate.tokens[0]?.price ?? 0;
    return candidatePrice > bestPrice ? candidate : best;
  });
}

/**
 * Polymarket slug for the 2026 FIFA World Cup Winner aggregate event. Slugs
 * are stable on Polymarket; matching on slug is more robust than matching by
 * title text, which the operator can edit at any time.
 */
export const FIFA_WORLD_CUP_2026_WINNER_POLYMARKET_SLUG =
  '2026-fifa-world-cup-winner';

const includesAll = (haystack: string, needles: string[]) => {
  const lower = haystack.toLowerCase();
  return needles.every((n) => lower.includes(n));
};

/**
 * Pick the "Who wins the 2026 FIFA World Cup?" market out of the homepage
 * World Cup feed. Prefers slug match, then falls back to title heuristics so
 * we still surface a row if Polymarket changes the slug. If both matching
 * strategies fail, keeps the row populated from the first returned market but
 * logs the mismatch so Sentry can flag that the resolver needs attention.
 */
export function pickWorldCupWinnerMarket(
  markets: PredictMarket[],
): PredictMarket | undefined {
  const bySlug = markets.find(
    (m) => m.slug === FIFA_WORLD_CUP_2026_WINNER_POLYMARKET_SLUG,
  );
  if (bySlug) {
    return bySlug;
  }

  const byTitle =
    markets.find((m) => includesAll(m.title, ['2026 fifa world cup winner'])) ??
    markets.find((m) => includesAll(m.title, ['world cup winner']));

  if (byTitle) {
    Logger.error(
      new Error(
        'pickWorldCupWinnerMarket: slug missing, fell back to title heuristic',
      ),
      { matchedMarketId: byTitle.id, slug: byTitle.slug },
    );
    return byTitle;
  }

  const fallback = markets[0];
  if (fallback) {
    Logger.error(
      new Error(
        'pickWorldCupWinnerMarket: slug and title heuristics failed, fell back to first market',
      ),
      {
        fallbackMarketId: fallback.id,
        fallbackMarketTitle: fallback.title,
        slug: fallback.slug,
        marketCount: markets.length,
      },
    );
  }

  return fallback;
}

/**
 * Resolve the Polymarket "2026 NBA Champion" aggregate event (one
 * `PredictMarket` per Gamma event; each team is an `outcome`, not a separate
 * top-level market).
 */
function pickNbaChampionEventMarket(
  markets: PredictMarket[],
): PredictMarket | undefined {
  return (
    markets.find((m) => m.id === NBA_2026_CHAMPION_POLYMARKET_EVENT_ID) ??
    markets.find((m) => includesAll(m.title, ['nba', '2026', 'champion'])) ??
    markets.find((m) => includesAll(m.title, ['nba', 'champion']))
  );
}

/**
 * For the homepage row: keep event-level `id` for navigation, but narrow
 * `outcomes` to the open team with the highest implied "Yes" so the subtitle
 * matches the favorite (same shape `PredictMarketRowItem` expects).
 */
function narrowNbaChampionMarketToFavoriteOutcome(
  parent: PredictMarket,
): PredictMarket | undefined {
  const best = pickHighestProbabilityOpenOutcome(parent);
  return best ? { ...parent, outcomes: [best] } : undefined;
}

export function resolveNbaChampionHomepageMarket(
  nbaMarkets: PredictMarket[],
  worldCupMarkets: PredictMarket[],
): PredictMarket | undefined {
  const parent =
    pickNbaChampionEventMarket(nbaMarkets) ??
    pickNbaChampionEventMarket(worldCupMarkets);
  return parent ? narrowNbaChampionMarketToFavoriteOutcome(parent) : undefined;
}
