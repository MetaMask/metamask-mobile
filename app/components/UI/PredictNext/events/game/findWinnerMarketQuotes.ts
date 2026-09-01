import type { PredictEvent } from '../../types';
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
 * Returns unique ungrouped home and away Game Selection quotes for a Game
 * winner presentation. A unique draw quote is included when present. Missing
 * or duplicate home or away selections fail closed.
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
