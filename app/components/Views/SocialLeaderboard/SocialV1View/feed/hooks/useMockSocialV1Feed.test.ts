import { renderHook } from '@testing-library/react-native';
import { useMockSocialV1Feed } from './useMockSocialV1Feed';
import { MOCK_SOCIAL_V1_FEED_ITEMS } from '../mocks/socialV1Feed.mock';

describe('useMockSocialV1Feed', () => {
  it('returns the three mocked V1 feed variants', () => {
    const { result } = renderHook(() => useMockSocialV1Feed());

    expect(result.current.items.map((item) => item.variant)).toEqual([
      'perpsOpen',
      'perpsClosed',
      'spotCompact',
    ]);
    expect(result.current.items).toHaveLength(MOCK_SOCIAL_V1_FEED_ITEMS.length);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('enables the chart only on the open perps item', () => {
    const { result } = renderHook(() => useMockSocialV1Feed());

    const [open, closed, compact] = result.current.items;

    expect(open.showChart).toBe(true);
    expect(open.chartSeries?.length).toBeGreaterThanOrEqual(2);
    expect(closed.showChart).toBe(false);
    expect(compact.showChart).toBeUndefined();
  });
});
