import { renderHook } from '@testing-library/react-native';
import { usePredictFeedItems } from './usePredictFeedItems';
import { Recurrence, type PredictMarket } from '../types';

const mockSelectPredictUpDownEnabledFlag = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: () => mockSelectPredictUpDownEnabledFlag(),
}));

jest.mock('../selectors/featureFlags', () => ({
  selectPredictUpDownEnabledFlag: jest.fn(),
}));

const createMockMarket = (
  id: string,
  overrides: Partial<PredictMarket> = {},
): PredictMarket =>
  ({
    id,
    providerId: 'polymarket',
    slug: `market-${id}`,
    title: `Market ${id}`,
    description: 'Description',
    image: 'https://example.com/img.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: [],
    outcomes: [],
    liquidity: 100,
    volume: 200,
    ...overrides,
  }) as PredictMarket;

const createUpDownMarket = (id: string, seriesSlug: string): PredictMarket =>
  createMockMarket(id, {
    series: {
      id: `s-${seriesSlug}`,
      slug: seriesSlug,
      title: seriesSlug,
      recurrence: '5m',
    },
    tags: ['crypto', 'up-or-down'],
  });

describe('usePredictFeedItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns marketData unchanged when flag is disabled', () => {
    mockSelectPredictUpDownEnabledFlag.mockReturnValue(false);
    const marketA = createMockMarket('a');
    const btc1 = createUpDownMarket('btc-1', 'btc-up-or-down-5m');
    const btc2 = createUpDownMarket('btc-2', 'btc-up-or-down-5m');
    const input = [marketA, btc1, btc2];

    const { result } = renderHook(() => usePredictFeedItems(input));

    expect(result.current).toBe(input);
  });

  it('deduplicates Up/Down markets when flag is enabled', () => {
    mockSelectPredictUpDownEnabledFlag.mockReturnValue(true);
    const btc1 = createUpDownMarket('btc-1', 'btc-up-or-down-5m');
    const regular = createMockMarket('regular');
    const btc2 = createUpDownMarket('btc-2', 'btc-up-or-down-5m');

    const { result } = renderHook(() =>
      usePredictFeedItems([btc1, regular, btc2]),
    );

    expect(result.current).toEqual([btc1, regular]);
  });

  it('returns empty array for empty input when flag is enabled', () => {
    mockSelectPredictUpDownEnabledFlag.mockReturnValue(true);

    const { result } = renderHook(() => usePredictFeedItems([]));

    expect(result.current).toEqual([]);
  });

  it('returns same reference when input does not change', () => {
    mockSelectPredictUpDownEnabledFlag.mockReturnValue(true);
    const markets = [createMockMarket('a'), createMockMarket('b')];

    const { result, rerender } = renderHook(() => usePredictFeedItems(markets));

    const firstResult = result.current;
    rerender({});

    expect(result.current).toBe(firstResult);
  });
});
