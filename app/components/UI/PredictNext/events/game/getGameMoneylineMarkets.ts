import { PREDICT_MARKET_LAYOUT_KEYS } from '../../constants';
import type { PredictEvent, PredictMarket } from '../../types';

const isFullGameMoneyline = ({ group, layout }: PredictMarket): boolean =>
  group?.groupType === 'choice' &&
  layout?.section.key === PREDICT_MARKET_LAYOUT_KEYS.MONEYLINE_SECTION &&
  layout.subgroup?.key === PREDICT_MARKET_LAYOUT_KEYS.FULL_GAME_SUBGROUP;

const isUngroupedMarket = (market: PredictMarket): boolean =>
  market.group === undefined;

/**
 * The Markets of a Game's full-game moneyline: its `choice` group laid out
 * under moneyline › full game. Period moneylines share the group type, so the
 * layout tells them apart. Events stored before the backend grouped
 * moneylines fall back to the Markets without a group.
 */
export const getGameMoneylineMarkets = (
  event: PredictEvent,
): PredictMarket[] => {
  const fullGame = event.markets.filter(isFullGameMoneyline);
  return fullGame.length > 0
    ? fullGame
    : event.markets.filter(isUngroupedMarket);
};
