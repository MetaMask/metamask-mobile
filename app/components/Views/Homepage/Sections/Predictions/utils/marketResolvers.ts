import type { PredictMarket } from '../../../../../UI/Predict/types';
import { isGameEnded } from '../../../../../UI/Predict/utils/scoreboard';
import Logger from '../../../../../../util/Logger';

const hasOpenOutcomeWithPrice = (market: Pick<PredictMarket, 'outcomes'>) =>
  market.outcomes.some(
    (outcome) => outcome.status === 'open' && outcome.tokens?.[0],
  );

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

export function pickLiveWorldCupGameMarket(
  markets: PredictMarket[],
): PredictMarket | undefined {
  return markets.find((market) => {
    const { game } = market;

    return (
      game?.status === 'ongoing' &&
      !isGameEnded({
        status: game.status,
        period: game.period,
        endTime: game.endTime,
      }) &&
      hasOpenOutcomeWithPrice(market)
    );
  });
}
