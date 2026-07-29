import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PredictMarket } from '../Predict/types';
import type { WhatsHappeningItem } from '../WhatsHappening/types';
import type { TopTrader } from '../../Views/Homepage/Sections/TopTraders/types';

export type DeckCardType = 'crypto' | 'perp' | 'prediction' | 'news' | 'trader';

export type DeckCard =
  | { type: 'crypto'; id: string; data: TrendingAsset }
  | { type: 'perp'; id: string; data: PerpsMarketData }
  | { type: 'prediction'; id: string; data: PredictMarket }
  | {
      type: 'news';
      id: string;
      data: WhatsHappeningItem;
      /** Index within the What's Happening feed, needed by the detail view. */
      feedIndex: number;
    }
  | { type: 'trader'; id: string; data: TopTrader };
