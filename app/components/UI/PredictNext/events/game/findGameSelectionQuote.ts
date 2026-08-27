import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import type { GameSelection } from './createGamePresentation';

export interface GameSelectionQuote {
  market: PredictMarket;
  outcome: PredictOutcome;
}

/**
 * Returns the unique Market and Outcome that authoritatively represent a
 * Game Selection. Ambiguous or missing selections yield no quote.
 */
export const findGameSelectionQuote = (
  event: PredictEvent,
  selection: GameSelection,
): GameSelectionQuote | undefined => {
  const matches = event.markets.flatMap((market) =>
    market.outcomes
      .filter((outcome) => outcome.gameSelection === selection)
      .map((outcome) => ({ market, outcome })),
  );

  return matches.length === 1 ? matches[0] : undefined;
};
