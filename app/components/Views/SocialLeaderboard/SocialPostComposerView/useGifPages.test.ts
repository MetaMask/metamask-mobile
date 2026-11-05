import { act, renderHook } from '@testing-library/react-native';
import { type Gif } from './gifPage';
import { useGifPages } from './useGifPages';

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en' },
}));

const fetchPage = jest.fn();

const gif = (id: string): Gif => ({
  id,
  title: id,
  previewUrl: `https://media.test/${id}-sm.gif`,
  gifUrl: `https://media.test/${id}.gif`,
});

describe('useGifPages', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchPage.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads trending gifs when the query is empty', async () => {
    fetchPage.mockResolvedValue({
      gifs: [gif('trend')],
      hasNext: false,
    });

    const { result } = renderHook(() =>
      useGifPages('', true, fetchPage, () => 'request_failed'),
    );

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(fetchPage).toHaveBeenCalledWith(
      expect.objectContaining({ query: '', page: 1, locale: 'en' }),
    );
    expect(result.current.gifs.map((item) => item.id)).toEqual(['trend']);
    expect(result.current.error).toBeNull();
  });

  it('loads search results after the query debounce', async () => {
    fetchPage.mockResolvedValue({
      gifs: [gif('cheers')],
      hasNext: false,
    });

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useGifPages(query, true, fetchPage, () => 'request_failed'),
      { initialProps: { query: '' } },
    );

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    fetchPage.mockClear();

    rerender({ query: 'cheers' });
    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(fetchPage).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(fetchPage).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'cheers', page: 1 }),
    );
    expect(result.current.gifs.map((item) => item.id)).toEqual(['cheers']);
  });

  it('appends the next page and skips duplicate ids', async () => {
    fetchPage
      .mockResolvedValueOnce({ gifs: [gif('a')], hasNext: true })
      .mockResolvedValueOnce({
        gifs: [gif('a'), gif('b')],
        hasNext: false,
      });

    const { result } = renderHook(() =>
      useGifPages('', true, fetchPage, () => 'request_failed'),
    );

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    act(() => {
      result.current.loadMore();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(result.current.gifs.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('does not fetch when disabled', async () => {
    const { result } = renderHook(() =>
      useGifPages('', false, fetchPage, () => 'request_failed'),
    );

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.gifs).toEqual([]);
  });

  it('reloads the first page when retrying after a failed load', async () => {
    fetchPage
      .mockRejectedValueOnce(new Error('429'))
      .mockResolvedValueOnce({ gifs: [gif('ok')], hasNext: false });

    const { result } = renderHook(() =>
      useGifPages('', true, fetchPage, () => 'request_failed'),
    );

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.error).toBe('request_failed');

    act(() => {
      result.current.retry();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 }),
    );
    expect(result.current.error).toBeNull();
    expect(result.current.gifs.map((item) => item.id)).toEqual(['ok']);
  });

  it('reports a failed load', async () => {
    fetchPage.mockRejectedValue(new Error('429'));

    const { result } = renderHook(() =>
      useGifPages('', true, fetchPage, () => 'request_failed' as const),
    );

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.error).toBe('request_failed');
    expect(result.current.gifs).toEqual([]);
  });
});
