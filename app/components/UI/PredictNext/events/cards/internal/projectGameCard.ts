import type {
  PredictEntityId,
  PredictEvent,
  PredictMarket,
  PredictOutcome,
} from '../../../types';
import { formatAskPrice } from './formatAskPrice';
import { parsePredictDecimal } from './parsePredictDecimal';

export type GameCardSelection = 'away' | 'home';

export interface GameTeamQuote {
  market: PredictMarket;
  outcome: PredictOutcome;
}

export interface GameCardProbability {
  awayPercent: number;
}

export interface GameCardProjection {
  quotes: Record<GameCardSelection, GameTeamQuote | undefined>;
  representedMarketIds: ReadonlySet<PredictEntityId>;
  hiddenMarketCount: number;
  probability: GameCardProbability | undefined;
}

const getTeamQuote = (
  event: PredictEvent,
  selection: GameCardSelection,
): GameTeamQuote | undefined => {
  const matches = event.markets.flatMap((market) =>
    market.outcomes
      .filter((outcome) => outcome.gameSelection === selection)
      .map((outcome) => ({ market, outcome })),
  );

  return matches.length === 1 ? matches[0] : undefined;
};

/**
 * Projects Game Selection quotes, represented Markets, and probability
 * segments for Game card compositions.
 */
export const projectGameCard = (event: PredictEvent): GameCardProjection => {
  const quotes = {
    away: getTeamQuote(event, 'away'),
    home: getTeamQuote(event, 'home'),
  };
  const representedMarketIds = new Set<PredictEntityId>();

  for (const quote of Object.values(quotes)) {
    if (quote && formatAskPrice(quote.outcome.askPrice)) {
      representedMarketIds.add(quote.market.id);
    }
  }

  const away = parsePredictDecimal(quotes.away?.outcome.askPrice);
  const home = parsePredictDecimal(quotes.home?.outcome.askPrice);
  let probability: GameCardProbability | undefined;

  if (away && home) {
    const total = away.plus(home);
    if (total.gt(0)) {
      probability = {
        awayPercent: away.div(total).times(100).toNumber(),
      };
    }
  }

  return {
    quotes,
    representedMarketIds,
    hiddenMarketCount: event.markets.filter(
      (market) => !representedMarketIds.has(market.id),
    ).length,
    probability,
  };
};
