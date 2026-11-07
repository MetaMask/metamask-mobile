import { act, renderHook } from '@testing-library/react-native';
import { fetchGifs } from './gifClient';
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

describe('useGifs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchGifs.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports a GIF API error code', async () => {
    const { GifApiError } = jest.requireActual('./gifClient');
    mockFetchGifs.mockRejectedValue(new GifApiError('request_failed'));

    const { result } = renderHook(() => useGifs('', true));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.error).toBe('request_failed');
    expect(result.current.gifs).toEqual([]);
  });

  it('reports request_failed when the fetch throws a generic error', async () => {
    mockFetchGifs.mockRejectedValue(new Error('429'));

    const { result } = renderHook(() => useGifs('', true));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(result.current.error).toBe('request_failed');
    expect(result.current.gifs).toEqual([]);
  });
});
