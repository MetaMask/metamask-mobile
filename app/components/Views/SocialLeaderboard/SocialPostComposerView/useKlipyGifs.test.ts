import { act, renderHook } from '@testing-library/react-native';
import { fetchKlipyGifs, type KlipyGif } from './klipyClient';
import { useKlipyGifs } from './useKlipyGifs';

jest.mock('./klipyClient', () => {
  const actual = jest.requireActual('./klipyClient');
  return {
    ...actual,
    fetchKlipyGifs: jest.fn(),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en' },
}));

const mockFetchKlipyGifs = jest.mocked(fetchKlipyGifs);

const gif = (id: string): KlipyGif => ({
  id,
  title: id,
  previewUrl: `https://media.test/${id}-sm.gif`,
  gifUrl: `https://media.test/${id}.gif`,
});

describe('useKlipyGifs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchKlipyGifs.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads trending gifs when the query is empty', async () => {
    mockFetchKlipyGifs.mockResolvedValue({
      gifs: [gif('trend')],
      hasNext: false,
    });

    const { result } = renderHook(() => useKlipyGifs('', true));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockFetchKlipyGifs).toHaveBeenCalledWith(
      expect.objectContaining({ query: '', page: 1, locale: 'en' }),
    );
    expect(result.current.gifs.map((item) => item.id)).toEqual(['trend']);
    expect(result.current.error).toBeNull();
  });

  it('loads search results after the query debounce', async () => {
    mockFetchKlipyGifs.mockResolvedValue({
      gifs: [gif('cheers')],
      hasNext: false,
    });

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useKlipyGifs(query, true),
      { initialProps: { query: '' } },
    );

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    mockFetchKlipyGifs.mockClear();

    rerender({ query: 'cheers' });
    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(mockFetchKlipyGifs).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(mockFetchKlipyGifs).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'cheers', page: 1 }),
    );
    expect(result.current.gifs.map((item) => item.id)).toEqual(['cheers']);
  });

  it('appends the next page and skips duplicate ids', async () => {
    mockFetchKlipyGifs
      .mockResolvedValueOnce({ gifs: [gif('a')], hasNext: true })
      .mockResolvedValueOnce({
        gifs: [gif('a'), gif('b')],
        hasNext: false,
      });

    const { result } = renderHook(() => useKlipyGifs('', true));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    act(() => {
      result.current.loadMore();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchKlipyGifs).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(result.current.gifs.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('reports a missing api key', async () => {
    const { KlipyApiError } = jest.requireActual('./klipyClient');
    mockFetchKlipyGifs.mockRejectedValue(new KlipyApiError('missing_api_key'));

    const { result } = renderHook(() => useKlipyGifs('', true));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.error).toBe('missing_api_key');
    expect(result.current.gifs).toEqual([]);
  });
});
