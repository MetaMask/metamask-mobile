import { act, renderHook } from '@testing-library/react-native';
import { fetchKlipyGifs } from './klipyClient';
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

describe('useKlipyGifs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchKlipyGifs.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
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
