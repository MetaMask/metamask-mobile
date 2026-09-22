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
 * The trading quote for a Game Selection: the Yes Outcome of the selection's
 * unique winner Market. Team controls always trade the Yes side, even when
 * the catalog tags the Game Selection on a No Outcome — the Game Selection
 * tag is chart association, not the traded side. Missing or ambiguous
 * selections, or a winner Market without a Yes Outcome, yield no quote.
 */
export const findGameTradingQuote = (
  event: PredictEvent,
  selection: PredictGameSelection,
): GameSelectionQuote | undefined => {
  const tagged = findGameSelectionQuote(event, selection);
  const yesOutcome = tagged?.market.outcomes.find(
    (outcome) => outcome.side === 'yes',
  );
  return tagged && yesOutcome
    ? { market: tagged.market, outcome: yesOutcome }
    : undefined;
};

/**
 * Returns unique ungrouped home and away Game Selection quotes for a Game
 * winner presentation, carrying the Outcome that bears the Game Selection
 * tag: the dual-line chart plots that Outcome's history. A unique draw quote
 * is included when present. Missing or duplicate home or away selections
 * fail closed. Trading-side selection is separate (findGameTradingQuote).
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
