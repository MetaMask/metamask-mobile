import {
  Recurrence,
  type PredictMarket,
} from '../../../app/components/UI/Predict/types';

export const MOCK_PREDICT_MARKET: PredictMarket = {
  id: 'market-btc-1',
  providerId: 'polymarket',
  slug: 'will-btc-reach-100k',
  title: 'Will Bitcoin reach $100k?',
  description: 'Will Bitcoin reach $100k by end of year?',
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'trending',
  tags: [],
  outcomes: [
    {
      id: 'outcome-yes',
      providerId: 'polymarket',
      marketId: 'market-btc-1',
      title: 'Will Bitcoin reach $100k?',
      description: '',
      image: '',
      status: 'open',
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.65 },
        { id: 'token-no', title: 'No', price: 0.35 },
      ],
      volume: 1_000_000,
      groupItemTitle: 'Yes',
    },
  ],
  liquidity: 500_000,
  volume: 1_000_000,
};
