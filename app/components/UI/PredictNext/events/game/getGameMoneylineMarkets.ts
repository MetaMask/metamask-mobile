import { PREDICT_MARKET_LAYOUT_KEYS } from '../../constants';
import type { PredictEvent, PredictMarket } from '../../types';

const isFullGameMoneyline = ({ group, layout }: PredictMarket): boolean =>
  group?.groupType === 'choice' &&
  layout?.section.key === PREDICT_MARKET_LAYOUT_KEYS.MONEYLINE_SECTION &&
  layout.subgroup?.key === PREDICT_MARKET_LAYOUT_KEYS.FULL_GAME_SUBGROUP;

/**
 * Returns the `choice` Markets under moneyline › full game. Period
 * moneylines share the group type, so the layout distinguishes them.
 */
export const getGameMoneylineMarkets = (event: PredictEvent): PredictMarket[] =>
  event.markets.filter(isFullGameMoneyline);
