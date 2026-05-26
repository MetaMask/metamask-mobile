import Logger from '../../../../../../util/Logger';
import {
  Recurrence,
  type PredictMarket,
} from '../../../../../UI/Predict/types';
import {
  FIFA_WORLD_CUP_2026_WINNER_POLYMARKET_SLUG,
  pickWorldCupWinnerMarket,
} from './marketResolvers';

jest.mock('../../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const createMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'provider-1',
  slug: 'some-world-cup-market',
  title: 'World Cup Group A match',
  description: 'Fallback market',
  image: 'https://example.com/image.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'world-cup',
  tags: ['world-cup'],
  outcomes: [],
  liquidity: 0,
  volume: 0,
  ...overrides,
});

describe('marketResolvers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pickWorldCupWinnerMarket', () => {
    it('does not log when the winner market is matched by slug', () => {
      const market = createMarket({
        slug: FIFA_WORLD_CUP_2026_WINNER_POLYMARKET_SLUG,
      });

      expect(pickWorldCupWinnerMarket([market])).toBe(market);
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('logs when falling back to the first market after slug and title heuristics fail', () => {
      const fallback = createMarket({
        id: 'fallback-market',
        slug: 'world-cup-group-a-match',
        title: 'Spain vs England',
      });

      expect(pickWorldCupWinnerMarket([fallback])).toBe(fallback);
      expect(Logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            'pickWorldCupWinnerMarket: slug and title heuristics failed, fell back to first market',
        }),
        {
          fallbackMarketId: 'fallback-market',
          fallbackMarketTitle: 'Spain vs England',
          slug: 'world-cup-group-a-match',
          marketCount: 1,
        },
      );
    });
  });
});
