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
  const ungroupedEvent = {
    ...event,
    markets: event.markets.filter((market) => market.group === undefined),
  };
  const home = findGameSelectionQuote(ungroupedEvent, 'home');
  const away = findGameSelectionQuote(ungroupedEvent, 'away');

  return home === undefined || away === undefined ? undefined : { home, away };
}
