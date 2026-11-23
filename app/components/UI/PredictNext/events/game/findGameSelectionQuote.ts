import type {
  PredictEvent,
  PredictGameSelection,
  PredictMarket,
  PredictOutcome,
} from '../../types';
import { getGameMoneylineMarkets } from './getGameMoneylineMarkets';

export interface GameSelectionQuote {
  market: PredictMarket;
  outcome: PredictOutcome;
}

/**
 * Returns the unique full-game moneyline Market and Outcome that
 * authoritatively represent a Game Selection. Ambiguous or missing selections
 * yield no quote.
 */
export const findGameSelectionQuote = (
  event: PredictEvent,
  selection: PredictGameSelection,
): GameSelectionQuote | undefined => {
  const matches = getGameMoneylineMarkets(event).flatMap((market) =>
    market.outcomes
      .filter((outcome) => outcome.gameSelection === selection)
      .map((outcome) => ({ market, outcome })),
  );

  return matches.length === 1 ? matches[0] : undefined;
};
