import { PREDICT_MARKET_LAYOUT_KEYS } from '../../../constants';
import type { PredictMarket } from '../../../types';

/** Group and layout metadata for a full-game moneyline Market fixture. */
export const fullGameMoneylineMetadata = (
  groupKey = 'moneyline',
): Pick<PredictMarket, 'group' | 'layout'> => ({
  group: { key: groupKey, groupType: 'choice' },
  layout: {
    tab: { key: 'game_lines', order: 0 },
    section: { key: PREDICT_MARKET_LAYOUT_KEYS.MONEYLINE_SECTION, order: 0 },
    subgroup: { key: PREDICT_MARKET_LAYOUT_KEYS.FULL_GAME_SUBGROUP, order: 0 },
  },
});
