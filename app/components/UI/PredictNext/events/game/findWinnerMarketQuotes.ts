import type { PredictEvent, PredictGameSelection } from '../../types';
import {
  findGameSelectionQuote,
  type GameSelectionQuote,
} from './findGameSelectionQuote';

export interface WinnerMarketQuotes {
  away: GameSelectionQuote;
  home: GameSelectionQuote;
  draw?: GameSelectionQuote;
}

/**
 * The trading quote for a chart quote: the Yes Outcome of the same winner
 * Market. The chart quote may tag the No side. That tag is chart association,
 * not the traded side. A winner Market without a Yes Outcome yields no quote.
 */
export const toGameTradingQuote = (
  quote: GameSelectionQuote,
): GameSelectionQuote | undefined => {
  const yesOutcome = quote.market.outcomes.find(
    (outcome) => outcome.side === 'yes',
  );
  return yesOutcome ? { market: quote.market, outcome: yesOutcome } : undefined;
};

/**
 * The trading quote for a Game Selection: the Yes Outcome of the selection's
 * unique winner Market. Missing or ambiguous selections, or a winner Market
 * without a Yes Outcome, yield no quote.
 */
export const findGameTradingQuote = (
  event: PredictEvent,
  selection: PredictGameSelection,
): GameSelectionQuote | undefined => {
  const tagged = findGameSelectionQuote(event, selection);
  return tagged ? toGameTradingQuote(tagged) : undefined;
};

/**
 * Returns unique home and away quotes from the full-game moneyline, plus a
 * unique draw quote when present. The dual-line chart plots the Outcomes
 * tagged with each Game Selection. Missing or duplicate home or away
 * selections yield no quotes. Trading-side selection is separate
 * (findGameTradingQuote).
 */
export const findWinnerMarketQuotes = (
  event: PredictEvent,
): WinnerMarketQuotes | undefined => {
  const away = findGameSelectionQuote(event, 'away');
  const home = findGameSelectionQuote(event, 'home');

  if (!away || !home) {
    return undefined;
  }

  const draw = findGameSelectionQuote(event, 'draw');

  return draw ? { away, home, draw } : { away, home };
};
