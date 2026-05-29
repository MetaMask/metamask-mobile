import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useBrowserFavoritesSites } from './useBrowserFavoritesSites';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../../selectors/browser', () => ({
  selectBrowserBookmarksWithType: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const setBookmarks = (bookmarks: { url: string; name: string }[]) => {
  mockUseSelector.mockReturnValue(bookmarks);
};

describe('useBrowserFavoritesSites', () => {
  beforeEach(() => mockUseSelector.mockReset());

  it('maps bookmarks to SiteData with prefixed URL and full display URL', () => {
    setBookmarks([{ url: 'uniswap.org', name: 'Uniswap' }]);
    const { result } = renderHook(() => useBrowserFavoritesSites());

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]).toEqual(
      expect.objectContaining({
        name: 'Uniswap',
        url: 'https://uniswap.org',
        displayUrl: 'uniswap.org',
        storedBookmarkUrl: 'uniswap.org',
      }),
    );
  });

  it('shows full path in displayUrl for favorites', () => {
    setBookmarks([
      { url: 'https://app.uniswap.org/swap?chain=1', name: 'Uniswap' },
    ]);
    const { result } = renderHook(() => useBrowserFavoritesSites());
    expect(result.current.data[0].displayUrl).toBe(
      'app.uniswap.org/swap?chain=1',
    );
  });

  it('falls back to the display URL when the bookmark has no name', () => {
    setBookmarks([{ url: 'https://example.com/path', name: '' }]);
    const { result } = renderHook(() => useBrowserFavoritesSites());
    expect(result.current.data[0].name).toBe('example.com');
  });

  it('skips entries with no URL', () => {
    setBookmarks([
      { url: '', name: 'Empty' },
      { url: 'https://ok.example.com', name: 'OK' },
    ]);
    const { result } = renderHook(() => useBrowserFavoritesSites());
    expect(result.current.data.map((s) => s.name)).toEqual(['OK']);
  });

  it('filters by search query against name + URL fields', () => {
    setBookmarks([
      { url: 'https://uniswap.org', name: 'Uniswap' },
      { url: 'https://opensea.io', name: 'OpenSea' },
    ]);
    const { result } = renderHook(() => useBrowserFavoritesSites('open'));
    expect(result.current.data.map((s) => s.name)).toEqual(['OpenSea']);
  });

  it('returns the full list when the search query is whitespace', () => {
    setBookmarks([
      { url: 'https://a.com', name: 'A' },
      { url: 'https://b.com', name: 'B' },
    ]);
    const { result } = renderHook(() => useBrowserFavoritesSites('   '));
    expect(result.current.data).toHaveLength(2);
  });
});
