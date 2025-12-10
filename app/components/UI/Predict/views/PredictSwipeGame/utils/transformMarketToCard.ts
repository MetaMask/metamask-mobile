import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
  SwipeGameCard,
  SwipePrimaryOutcome,
  SwipeAlternativeOutcome,
  SwipeOutcomeToken,
} from '../PredictSwipeGame.types';

/**
 * Find the Yes token from an outcome's tokens array
 * Polymarket typically has tokens[0] = Yes, tokens[1] = No
 * But we check by title to be safe
 */
function findYesToken(tokens: PredictOutcomeToken[]): SwipeOutcomeToken | null {
  if (!tokens || tokens.length === 0) return null;

  // Try to find by title first
  const yesByTitle = tokens.find(
    (t) => t.title.toLowerCase() === 'yes' || t.title.toLowerCase() === 'true',
  );
  if (yesByTitle) {
    return {
      id: yesByTitle.id,
      title: yesByTitle.title,
      price: yesByTitle.price,
    };
  }

  // Fall back to first token
  return {
    id: tokens[0].id,
    title: tokens[0].title,
    price: tokens[0].price,
  };
}

/**
 * Find the No token from an outcome's tokens array
 */
function findNoToken(tokens: PredictOutcomeToken[]): SwipeOutcomeToken | null {
  if (!tokens || tokens.length < 2) return null;

  // Try to find by title first
  const noByTitle = tokens.find(
    (t) => t.title.toLowerCase() === 'no' || t.title.toLowerCase() === 'false',
  );
  if (noByTitle) {
    return {
      id: noByTitle.id,
      title: noByTitle.title,
      price: noByTitle.price,
    };
  }

  // Fall back to second token
  return {
    id: tokens[1].id,
    title: tokens[1].title,
    price: tokens[1].price,
  };
}

/**
 * Transform a PredictOutcome to SwipePrimaryOutcome
 */
function outcomeToPrimaryOutcome(
  outcome: PredictOutcome,
): SwipePrimaryOutcome | null {
  const yesToken = findYesToken(outcome.tokens);
  const noToken = findNoToken(outcome.tokens);

  if (!yesToken || !noToken) {
    return null;
  }

  return {
    outcomeId: outcome.id,
    yesToken,
    noToken,
    title: outcome.title || outcome.groupItemTitle,
    negRisk: outcome.negRisk,
    tickSize: outcome.tickSize,
  };
}

/**
 * Transform a PredictOutcome to SwipeAlternativeOutcome
 */
function outcomeToAlternativeOutcome(
  outcome: PredictOutcome,
): SwipeAlternativeOutcome | null {
  const yesToken = findYesToken(outcome.tokens);
  const noToken = findNoToken(outcome.tokens);

  if (!yesToken || !noToken) {
    return null;
  }

  return {
    outcomeId: outcome.id,
    // Prefer groupItemTitle (shorter) like in the feed, fallback to title
    title: outcome.groupItemTitle || outcome.title,
    volume: outcome.volume,
    yesToken,
    noToken,
    negRisk: outcome.negRisk,
    tickSize: outcome.tickSize,
  };
}

/**
 * Transform a PredictMarket to a SwipeGameCard
 *
 * For markets with multiple outcomes:
 * - Keep the default order from the API (same as feed/market detail)
 * - First outcome becomes the primary bet
 * - Rest become alternative outcomes
 */
export function transformMarketToCard(
  market: PredictMarket,
): SwipeGameCard | null {
  // Need at least one outcome
  if (!market.outcomes || market.outcomes.length === 0) {
    return null;
  }

  // Filter out outcomes that don't have valid Yes/No tokens
  const validOutcomes = market.outcomes.filter(
    (o) => o.tokens && o.tokens.length >= 2,
  );

  if (validOutcomes.length === 0) {
    return null;
  }

  // First outcome is primary (keep original API order)
  const primaryOutcomeRaw = validOutcomes[0];
  const primaryOutcome = outcomeToPrimaryOutcome(primaryOutcomeRaw);

  if (!primaryOutcome) {
    return null;
  }

  // Rest are alternatives (keep original API order)
  const alternativeOutcomes = validOutcomes
    .slice(1)
    .map(outcomeToAlternativeOutcome)
    .filter((o): o is SwipeAlternativeOutcome => o !== null);

  return {
    marketId: market.id,
    providerId: market.providerId,
    title: market.title,
    description: market.description,
    image: market.image,
    endDate: market.endDate,
    primaryOutcome,
    alternativeOutcomes,
    totalVolume: market.volume,
    liquidity: market.liquidity,
    isMultiOutcome: validOutcomes.length > 1,
    tags: market.tags || [],
  };
}

/**
 * Transform multiple markets to swipe cards
 * Filters out any markets that can't be transformed
 */
export function transformMarketsToCards(
  markets: PredictMarket[],
): SwipeGameCard[] {
  return markets
    .map(transformMarketToCard)
    .filter((card): card is SwipeGameCard => card !== null);
}
