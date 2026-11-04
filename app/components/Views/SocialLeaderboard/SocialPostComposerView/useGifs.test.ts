import { act, renderHook } from '@testing-library/react-native';
import { fetchGifs, type Gif } from './gifClient';
import { useGifs } from './useGifs';

jest.mock('./gifClient', () => {
  const actual = jest.requireActual('./gifClient');
  return {
    ...actual,
    fetchGifs: jest.fn(),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en' },
}));

const mockFetchGifs = jest.mocked(fetchGifs);

const gif = (id: string): Gif => ({
  id,
  title: id,
  previewUrl: `https://media.test/${id}-sm.gif`,
  gifUrl: `https://media.test/${id}.gif`,
});

describe('useGifs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchGifs.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads trending gifs when the query is empty', async () => {
    mockFetchGifs.mockResolvedValue({
      gifs: [gif('trend')],
      hasNext: false,
    });

    const { result } = renderHook(() => useGifs('', true));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockFetchGifs).toHaveBeenCalledWith(
      expect.objectContaining({ query: '', page: 1, locale: 'en' }),
    );
    expect(result.current.gifs.map((item) => item.id)).toEqual(['trend']);
    expect(result.current.error).toBeNull();
  });

  it('loads search results after the query debounce', async () => {
    mockFetchGifs.mockResolvedValue({
      gifs: [gif('cheers')],
      hasNext: false,
    });

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useGifs(query, true),
      { initialProps: { query: '' } },
    );

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    mockFetchGifs.mockClear();

    rerender({ query: 'cheers' });
    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(mockFetchGifs).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(mockFetchGifs).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'cheers', page: 1 }),
    );
    expect(result.current.gifs.map((item) => item.id)).toEqual(['cheers']);
  });

  it('appends the next page and skips duplicate ids', async () => {
    mockFetchGifs
      .mockResolvedValueOnce({ gifs: [gif('a')], hasNext: true })
      .mockResolvedValueOnce({
        gifs: [gif('a'), gif('b')],
        hasNext: false,
      });

    const { result } = renderHook(() => useGifs('', true));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    act(() => {
      result.current.loadMore();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchGifs).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(result.current.gifs.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('reports a failed load', async () => {
    const { GifApiError } = jest.requireActual('./gifClient');
    mockFetchGifs.mockRejectedValue(new GifApiError('request_failed'));

    const { result } = renderHook(() => useGifs('', true));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.error).toBe('request_failed');
    expect(result.current.gifs).toEqual([]);
  });
});
