import Logger from '../../../../../../util/Logger';
import {
  Recurrence,
  type PredictMarket,
} from '../../../../../UI/Predict/types';
import {
  FIFA_WORLD_CUP_2026_WINNER_POLYMARKET_SLUG,
  pickLiveWorldCupGameMarket,
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

  describe('pickLiveWorldCupGameMarket', () => {
    it('returns the first ongoing game with an open priced outcome', () => {
      const scheduled = createMarket({
        id: 'scheduled-game',
        outcomes: [
          {
            id: 'scheduled-outcome',
            providerId: 'scheduled-provider-outcome',
            marketId: 'scheduled-game',
            title: 'France',
            description: 'France wins',
            image: '',
            status: 'open',
            tokens: [{ id: 'scheduled-token', title: 'France', price: 0.67 }],
            volume: 0,
            groupItemTitle: 'France',
          },
        ],
        game: {
          id: 'game-1',
          startTime: '2026-06-01T20:00:00.000Z',
          status: 'scheduled',
          league: 'fifwc',
          elapsed: null,
          period: null,
          score: null,
          homeTeam: {
            id: 'france',
            name: 'France',
            logo: '',
            abbreviation: 'FRA',
            color: '',
          },
          awayTeam: {
            id: 'senegal',
            name: 'Senegal',
            logo: '',
            abbreviation: 'SEN',
            color: '',
          },
        },
      });
      const live = createMarket({
        id: 'live-game',
        title: 'France vs. Senegal',
        outcomes: [
          {
            id: 'live-outcome',
            providerId: 'live-provider-outcome',
            marketId: 'live-game',
            title: 'France',
            description: 'France wins',
            image: '',
            status: 'open',
            tokens: [{ id: 'live-token', title: 'France', price: 0.67 }],
            volume: 0,
            groupItemTitle: 'France',
          },
        ],
        game: {
          id: 'game-2',
          startTime: '2026-06-01T20:00:00.000Z',
          status: 'ongoing',
          league: 'fifwc',
          elapsed: '03:58',
          period: '1H',
          score: null,
          homeTeam: {
            id: 'france',
            name: 'France',
            logo: '',
            abbreviation: 'FRA',
            color: '',
          },
          awayTeam: {
            id: 'senegal',
            name: 'Senegal',
            logo: '',
            abbreviation: 'SEN',
            color: '',
          },
        },
      });

      const result = pickLiveWorldCupGameMarket([scheduled, live]);

      expect(result).toBe(live);
    });

    it('ignores games that have ended even when status remains ongoing', () => {
      const ended = createMarket({
        id: 'ended-game',
        outcomes: [
          {
            id: 'ended-outcome',
            providerId: 'ended-provider-outcome',
            marketId: 'ended-game',
            title: 'France',
            description: 'France wins',
            image: '',
            status: 'open',
            tokens: [{ id: 'ended-token', title: 'France', price: 0.67 }],
            volume: 0,
            groupItemTitle: 'France',
          },
        ],
        game: {
          id: 'game-3',
          startTime: '2026-06-01T20:00:00.000Z',
          endTime: '2026-06-01T22:00:00.000Z',
          status: 'ongoing',
          league: 'fifwc',
          elapsed: '90',
          period: 'FT',
          score: null,
          homeTeam: {
            id: 'france',
            name: 'France',
            logo: '',
            abbreviation: 'FRA',
            color: '',
          },
          awayTeam: {
            id: 'senegal',
            name: 'Senegal',
            logo: '',
            abbreviation: 'SEN',
            color: '',
          },
        },
      });

      const result = pickLiveWorldCupGameMarket([ended]);

      expect(result).toBeUndefined();
    });
  });
});
