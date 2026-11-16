import {
  findGameSelectionQuote,
  type GameSelectionQuote,
} from '../../../events/game';
import type { PredictEvent } from '../../../types';

export interface GameHistoryMarkets {
  home: GameSelectionQuote;
  away: GameSelectionQuote;
}

export function resolveGameHistoryMarkets(
  event: PredictEvent,
): GameHistoryMarkets | undefined {
  const home = findGameSelectionQuote(event, 'home');
  const away = findGameSelectionQuote(event, 'away');

  return home === undefined || away === undefined ? undefined : { home, away };
}
