import { renderHook } from '@testing-library/react-native';
import { useTraderFeed } from './useTraderFeed';

describe('useTraderFeed', () => {
  it('returns a non-empty grouped mock feed for the "all" audience', () => {
    const { result } = renderHook(() => useTraderFeed({ audience: 'all' }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.items.length).toBeGreaterThan(0);
    expect(result.current.sections.length).toBeGreaterThan(0);
  });

  it('defaults to the "all" audience', () => {
    const { result } = renderHook(() => useTraderFeed());

    expect(result.current.items.length).toBeGreaterThan(0);
  });

  it('returns an empty feed for the "following" audience (mock mode)', () => {
    const { result } = renderHook(() =>
      useTraderFeed({ audience: 'following' }),
    );

    expect(result.current.items).toHaveLength(0);
    expect(result.current.sections).toHaveLength(0);
  });

  it('orders items newest-first within a section', () => {
    const { result } = renderHook(() => useTraderFeed({ audience: 'all' }));

    result.current.sections.forEach((section) => {
      const timestamps = section.data.map((item) => item.timestamp);
      const sorted = [...timestamps].sort((a, b) => b - a);
      expect(timestamps).toEqual(sorted);
    });
  });
});
