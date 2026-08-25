import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useKycDisclaimers } from './useKycDisclaimers';

const mockGetBearerToken = jest.fn();
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: () => mockGetBearerToken(),
    },
  },
}));

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  KYC_API_BASE_URL: 'https://kyc-api.test',
}));

describe('useKycDisclaimers', () => {
  let globalFetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockGetBearerToken.mockResolvedValue('mock-bearer-token');
    globalFetchSpy = jest.spyOn(global, 'fetch');
  });

  it('fetches disclaimers scoped to the given country using a bearer token', async () => {
    globalFetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', url: 'https://t.c', display_name: 'T&C' }],
    });

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toStrictEqual([
      { id: '1', url: 'https://t.c', display_name: 'T&C' },
    ]);
    expect(result.current.error).toBeNull();

    const [calledUrl, calledOptions] = globalFetchSpy.mock.calls[0];
    expect(calledUrl).toBe(
      'https://kyc-api.test/vendors/moonpay/disclaimers?country=BRA',
    );
    expect(calledOptions.headers.Authorization).toBe(
      'Bearer mock-bearer-token',
    );
  });

  it('treats an empty successful response as an error so the CTA is not soft-locked', async () => {
    globalFetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toStrictEqual([]);
    expect(result.current.error).toBe('No KYC disclaimers returned');
  });

  it('times out when getting the bearer token hangs', async () => {
    jest.useFakeTimers();
    try {
      // A token call that never settles used to leave isLoading true forever.
      mockGetBearerToken.mockReturnValueOnce(new Promise(() => undefined));

      const { result } = renderHook(() => useKycDisclaimers('BRA'));

      act(() => {
        jest.advanceTimersByTime(10_000);
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('Request timed out');
      expect(globalFetchSpy).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('sets an error and empty list when the request fails', async () => {
    globalFetchSpy.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toStrictEqual([]);
    expect(result.current.error).toContain('500');
  });

  it('sets an error when getting the bearer token throws', async () => {
    mockGetBearerToken.mockRejectedValueOnce(new Error('not signed in'));

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toStrictEqual([]);
    expect(result.current.error).toBe('not signed in');
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  it('sets a distinct timeout error and clears any stale disclaimers when the request is aborted', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    globalFetchSpy.mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toStrictEqual([]);
    expect(result.current.error).toBe('Request timed out');

    // The fetch is given an AbortSignal so the in-flight request can actually
    // be cancelled once FETCH_TIMEOUT_MS elapses.
    const [, calledOptions] = globalFetchSpy.mock.calls[0];
    expect(calledOptions.signal).toBeInstanceOf(AbortSignal);
  });

  it('re-fetches and clears the previous error when retry is called', async () => {
    globalFetchSpy
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', url: 'https://t.c', display_name: 'T&C' },
        ],
      });

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toContain('500');

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.disclaimers).toStrictEqual([
      { id: '1', url: 'https://t.c', display_name: 'T&C' },
    ]);
    expect(globalFetchSpy).toHaveBeenCalledTimes(2);
  });
});
