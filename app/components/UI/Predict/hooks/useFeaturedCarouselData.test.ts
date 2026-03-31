import { renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { useFeaturedCarouselData } from './useFeaturedCarouselData';
import { PredictMarket, Recurrence } from '../types';

jest.mock('../../../../util/Logger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getCarouselMarkets: jest.fn(),
    },
  },
}));

const mockGetCarouselMarkets = Engine.context.PredictController
  .getCarouselMarkets as jest.Mock;

const createMockMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'btc-200k',
  title: 'Will BTC hit $200k?',
  description: 'BTC prediction',
  image: 'https://example.com/btc.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [
    {
      id: 'outcome-1',
      providerId: 'polymarket',
      marketId: 'market-1',
      title: 'Yes',
      description: '',
      image: '',
      status: 'open',
      tokens: [{ id: 't1', title: 'Yes', price: 0.65 }],
      volume: 100000,
      groupItemTitle: 'Yes',
    },
  ],
  liquidity: 1500000,
  volume: 1500000,
  ...overrides,
});

describe('useFeaturedCarouselData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns loading state initially', () => {
    mockGetCarouselMarkets.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useFeaturedCarouselData());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.markets).toHaveLength(0);
  });

  it('returns parsed markets after fetch', async () => {
    const mockMarkets = [
      createMockMarket({ id: 'm1' }),
      createMockMarket({ id: 'm2' }),
    ];
    mockGetCarouselMarkets.mockResolvedValue(mockMarkets);

    const { result } = renderHook(() => useFeaturedCarouselData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markets).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('returns error when controller throws', async () => {
    mockGetCarouselMarkets.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFeaturedCarouselData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.markets).toHaveLength(0);
  });

  it('returns empty markets when controller returns empty array', async () => {
    mockGetCarouselMarkets.mockResolvedValue([]);

    const { result } = renderHook(() => useFeaturedCarouselData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.markets).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('re-fetches data when refetch is called', async () => {
    mockGetCarouselMarkets.mockResolvedValue([createMockMarket()]);

    const { result } = renderHook(() => useFeaturedCarouselData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetCarouselMarkets).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    expect(mockGetCarouselMarkets).toHaveBeenCalledTimes(2);
  });
});
