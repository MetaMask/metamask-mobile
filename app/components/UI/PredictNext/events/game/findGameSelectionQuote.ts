import type {
  PredictEvent,
  PredictGameSelection,
  PredictMarket,
  PredictOutcome,
} from '../../types';

export interface GameSelectionQuote {
  market: PredictMarket;
  outcome: PredictOutcome;
}

const isUngroupedMarket = (market: PredictMarket): boolean =>
  market.group === undefined;

/**
 * Returns the unique ungrouped Market and Outcome that authoritatively
 * represent a Game Selection. Ambiguous or missing selections yield no quote.
 */
export const findGameSelectionQuote = (
  event: PredictEvent,
  selection: PredictGameSelection,
): GameSelectionQuote | undefined => {
  const matches = event.markets
    .filter(isUngroupedMarket)
    .flatMap((market) =>
      market.outcomes
        .filter((outcome) => outcome.gameSelection === selection)
        .map((outcome) => ({ market, outcome })),
    );

  return matches.length === 1 ? matches[0] : undefined;
};
