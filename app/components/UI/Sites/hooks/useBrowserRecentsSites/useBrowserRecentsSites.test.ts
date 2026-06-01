import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useBrowserRecentsSites } from './useBrowserRecentsSites';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Short-circuit the transitive import chain
// (browser selectors → UrlAutocomplete → entire TrendingView graph).
jest.mock('../../../../../selectors/browser', () => ({
  selectBrowserHistoryWithType: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const setHistory = (history: { url: string; name: string }[]) => {
  mockUseSelector.mockReturnValue(history);
};

describe('useBrowserRecentsSites', () => {
  beforeEach(() => {
    mockUseSelector.mockReset();
  });

  it('returns an empty list when there is no history', () => {
    setHistory([]);
    const { result } = renderHook(() => useBrowserRecentsSites());
    expect(result.current.data).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('deduplicates entries that normalize to the same URL', () => {
    // Same origin+path; different trailing slash and hash should collapse.
    setHistory([
      { url: 'https://uniswap.org/swap', name: 'Uniswap Swap' },
      { url: 'https://uniswap.org/swap/', name: 'Uniswap Swap dup1' },
      { url: 'https://uniswap.org/swap#fragment', name: 'Uniswap Swap dup2' },
    ]);
    const { result } = renderHook(() => useBrowserRecentsSites());
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].name).toBe('Uniswap Swap');
  });

  it('caps results at 5 entries (latest first)', () => {
    setHistory(
      Array.from({ length: 10 }, (_, i) => ({
        url: `https://site${i}.example.com`,
        name: `Site ${i}`,
      })),
    );
    const { result } = renderHook(() => useBrowserRecentsSites());
    expect(result.current.data).toHaveLength(5);
    // Selector returns history reversed (latest first); dedup keeps first occurrence.
    expect(result.current.data.map((s) => s.name)).toEqual([
      'Site 0',
      'Site 1',
      'Site 2',
      'Site 3',
      'Site 4',
    ]);
  });

  it('falls back gracefully when an entry has a malformed URL', () => {
    // The new URL() in normalizeUrlKey throws — the catch returns the raw string.
    setHistory([
      { url: 'not a real url', name: 'Bad' },
      { url: 'https://good.example.com', name: 'Good' },
    ]);
    const { result } = renderHook(() => useBrowserRecentsSites());
    // Both pass; neither throws.
    expect(result.current.data.map((s) => s.name)).toEqual(['Bad', 'Good']);
  });

  it('skips entries that have no URL', () => {
    setHistory([
      { url: '', name: 'Empty' },
      { url: 'https://ok.example.com', name: 'OK' },
    ]);
    const { result } = renderHook(() => useBrowserRecentsSites());
    expect(result.current.data.map((s) => s.name)).toEqual(['OK']);
  });

  it('uses extracted display URL when entry name is empty', () => {
    setHistory([{ url: 'https://example.com/path', name: '' }]);
    const { result } = renderHook(() => useBrowserRecentsSites());
    expect(result.current.data[0].name).toBe('example.com');
    expect(result.current.data[0].displayUrl).toBe('example.com/path');
  });

  it('shows full path in displayUrl for recents', () => {
    setHistory([
      { url: 'https://app.uniswap.org/swap?chain=1', name: 'Uniswap' },
    ]);
    const { result } = renderHook(() => useBrowserRecentsSites());
    expect(result.current.data[0].displayUrl).toBe(
      'app.uniswap.org/swap?chain=1',
    );
  });
});
