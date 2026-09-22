import { getEventGame, findWinnerMarketQuotes } from '../game';
import type { PredictEntityId, PredictEvent } from '../../types';
import { EVENT_CARD_VISIBLE_MARKET_COUNT } from './internal/EventCard';

/**
 * Market ids a Home/Feed Event card actually prices. Game cards show winner
 * quotes only; standard cards show the first three Markets. Hidden props and
 * grouped lines stay off the live-data watch list until Event Screen opens.
 */
export const getEventCardLiveMarketIds = (
  event: PredictEvent,
): PredictEntityId[] => {
  if (getEventGame(event)) {
    const quotes = findWinnerMarketQuotes(event);
    if (!quotes) {
      return [];
    }

    return [
      ...new Set([
        quotes.away.market.id,
        quotes.home.market.id,
        ...(quotes.draw ? [quotes.draw.market.id] : []),
      ]),
    ];
  }

  return event.markets
    .slice(0, EVENT_CARD_VISIBLE_MARKET_COUNT)
    .map((market) => market.id);
};
