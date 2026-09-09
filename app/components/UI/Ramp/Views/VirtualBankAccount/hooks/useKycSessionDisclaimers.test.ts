import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useKycSessionDisclaimers } from './useKycSessionDisclaimers';

const mockFetchSessionDisclaimers = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      fetchSessionDisclaimers: (...args: unknown[]) =>
        mockFetchSessionDisclaimers(...args),
    },
  },
}));

const catalog = {
  idOS: [
    {
      key: 'idos-privacy',
      version: '1',
      title: 'idOS Privacy Policy',
      url: 'https://idos.example/privacy',
    },
  ],
  kycProvider: [
    {
      key: 'sumsub-terms',
      version: '2',
      title: 'Sumsub T&C',
      url: 'https://sumsub.example/terms',
    },
  ],
};

describe('useKycSessionDisclaimers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchSessionDisclaimers.mockResolvedValue(catalog);
  });

  it('loads idOS and SumSub catalog documents for the given country via KycController', async () => {
    const { result } = renderHook(() => useKycSessionDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchSessionDisclaimers).toHaveBeenCalledWith({
      country: 'BRA',
    });
    expect(result.current.disclaimers).toStrictEqual([
      {
        id: 'idOS:idos-privacy',
        key: 'idos-privacy',
        version: '1',
        title: 'idOS Privacy Policy',
        url: 'https://idos.example/privacy',
      },
      {
        id: 'kycProvider:sumsub-terms',
        key: 'sumsub-terms',
        version: '2',
        title: 'Sumsub T&C',
        url: 'https://sumsub.example/terms',
      },
    ]);
    expect(result.current.error).toBeNull();
  });

  it('treats an empty catalog as an error so the CTA is not soft-locked', async () => {
    mockFetchSessionDisclaimers.mockResolvedValueOnce({
      idOS: [],
      kycProvider: [],
    });

    const { result } = renderHook(() => useKycSessionDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toBeNull();
    expect(result.current.error).toBe('No KYC disclaimers returned');
  });

  it('times out when fetchSessionDisclaimers hangs', async () => {
    jest.useFakeTimers();
    try {
      mockFetchSessionDisclaimers.mockReturnValueOnce(
        new Promise(() => undefined),
      );

      const { result } = renderHook(() => useKycSessionDisclaimers('BRA'));

      await act(async () => {
        jest.advanceTimersByTime(10_000);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.disclaimers).toBeNull();
      expect(result.current.error).toBe('Request timed out');
    } finally {
      jest.useRealTimers();
    }
  });

  it('propagates thrown errors from fetchSessionDisclaimers', async () => {
    mockFetchSessionDisclaimers.mockRejectedValueOnce(
      new Error('not signed in'),
    );

    const { result } = renderHook(() => useKycSessionDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toBeNull();
    expect(result.current.error).toBe('not signed in');
  });

  it('re-loads and clears the previous error when retry is called', async () => {
    mockFetchSessionDisclaimers
      .mockRejectedValueOnce(new Error('server error'))
      .mockResolvedValueOnce(catalog);

    const { result } = renderHook(() => useKycSessionDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('server error');

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.disclaimers).toHaveLength(2);
    expect(mockFetchSessionDisclaimers).toHaveBeenCalledTimes(2);
  });
});
