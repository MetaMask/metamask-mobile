import Engine from '../../../../core/Engine';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../constants/flags';
import { Recurrence, type PredictMarket } from '../types';
import { predictWorldCupOptions } from './worldCup';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarkets: jest.fn(),
    },
  },
}));

const mockGetMarkets = jest.mocked(Engine.context.PredictController.getMarkets);

const createMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'market-1',
  title: 'Market 1',
  description: 'Description',
  image: 'image.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'hot',
  tags: [],
  outcomes: [],
  liquidity: 0,
  volume: 0,
  ...overrides,
});

describe('worldCup queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches All markets with the World Cup tag query and pagination', async () => {
    const markets = [createMarket()];
    mockGetMarkets.mockResolvedValue({ markets, nextCursor: null });

    const options = predictWorldCupOptions.all(DEFAULT_PREDICT_WORLD_CUP_FLAG, {
      limit: 10,
    });
    const result = await (options.queryFn as () => Promise<PredictMarket[]>)();

    expect(mockGetMarkets).toHaveBeenCalledWith({
      category: 'hot',
      customQueryParams:
        'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&order=volume24hr&ascending=false',
      limit: 10,
    });
    expect(result).toEqual(markets);
  });

  it('fetches Props markets with the games tag excluded and pagination', async () => {
    mockGetMarkets.mockResolvedValue({
      markets: [createMarket()],
      nextCursor: null,
    });

    const options = predictWorldCupOptions.props(
      DEFAULT_PREDICT_WORLD_CUP_FLAG,
      {
        limit: 25,
      },
    );
    await (options.queryFn as () => Promise<PredictMarket[]>)();

    expect(mockGetMarkets).toHaveBeenCalledWith({
      category: 'hot',
      customQueryParams:
        'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&exclude_tag_id=100639&order=volume&ascending=false',
      limit: 25,
    });
  });

  it('fetches Live markets with series, games tag, and live filters', async () => {
    mockGetMarkets.mockResolvedValue({
      markets: [createMarket()],
      nextCursor: null,
    });

    const options = predictWorldCupOptions.live(
      DEFAULT_PREDICT_WORLD_CUP_FLAG,
      {
        limit: 5,
      },
    );
    await (options.queryFn as () => Promise<PredictMarket[]>)();

    expect(mockGetMarkets).toHaveBeenCalledWith({
      category: 'hot',
      customQueryParams:
        'active=true&archived=false&closed=false&series_id=11433&tag_id=100639&live=true&order=startDate',
      limit: 5,
    });
  });

  it('fetches stage markets with repeated event IDs', async () => {
    const baseGame = {
      id: 'game-later',
      startTime: '2026-06-13T20:00:00.000Z',
      status: 'scheduled' as const,
      league: 'fifwc' as const,
      elapsed: null,
      period: null,
      score: null,
      homeTeam: {
        id: 'team-1',
        name: 'Team 1',
        logo: '',
        abbreviation: 'T1',
        color: 'black',
      },
      awayTeam: {
        id: 'team-2',
        name: 'Team 2',
        logo: '',
        abbreviation: 'T2',
        color: 'white',
      },
    };
    const laterMarket = createMarket({
      id: 'later',
      title: 'Later',
      game: baseGame,
    });
    const earlierMarket = createMarket({
      id: 'earlier',
      title: 'Earlier',
      game: {
        ...baseGame,
        id: 'game-earlier',
        startTime: '2026-06-12T20:00:00.000Z',
      },
    });
    mockGetMarkets.mockResolvedValue({
      markets: [laterMarket, earlierMarket],
      nextCursor: null,
    });

    const options = predictWorldCupOptions.stage({
      key: 'group-stage',
      eventIds: ['123', '456'],
    });
    const result = await (options.queryFn as () => Promise<PredictMarket[]>)();

    expect(mockGetMarkets).toHaveBeenCalledWith({
      category: 'hot',
      customQueryParams:
        'active=true&archived=false&closed=false&id=123&id=456',
      limit: 2,
    });
    expect(result.map((market) => market.id)).toEqual(['later', 'earlier']);
  });

  it('uses lightweight availability requests for Live, Props, and stages', async () => {
    mockGetMarkets.mockResolvedValue({
      markets: [createMarket()],
      nextCursor: null,
    });

    await (
      predictWorldCupOptions.availability.live(DEFAULT_PREDICT_WORLD_CUP_FLAG)
        .queryFn as () => Promise<boolean>
    )();
    await (
      predictWorldCupOptions.availability.props(DEFAULT_PREDICT_WORLD_CUP_FLAG)
        .queryFn as () => Promise<boolean>
    )();
    await (
      predictWorldCupOptions.availability.stage({
        key: 'final',
        eventIds: ['999'],
      }).queryFn as () => Promise<boolean>
    )();

    expect(mockGetMarkets).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ limit: 1 }),
    );
    expect(mockGetMarkets).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ limit: 1 }),
    );
    expect(mockGetMarkets).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        customQueryParams: 'active=true&archived=false&closed=false&id=999',
        limit: 1,
      }),
    );
  });

  it('hides empty stage tabs without calling the API when no event IDs are configured', async () => {
    const options = predictWorldCupOptions.availability.stage({
      key: 'empty-stage',
      eventIds: [],
    });

    expect((options.queryFn as () => boolean)()).toBe(false);
    expect(mockGetMarkets).not.toHaveBeenCalled();
  });
});
