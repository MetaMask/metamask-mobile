import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { useKycSessionDisclaimers } from './useKycSessionDisclaimers';

const mockFetchSessionDisclaimers = jest.fn();
const mockGetGeoCountry = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      fetchSessionDisclaimers: (...args: unknown[]) =>
        mockFetchSessionDisclaimers(...args),
    },
    KycService: {
      getGeoCountry: (...args: unknown[]) => mockGetGeoCountry(...args),
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
    mockGetGeoCountry.mockResolvedValue('BRA');
  });

  it('loads idOS and SumSub catalog documents for the geo country via KycController', async () => {
    const { result } = renderHook(() => useKycSessionDisclaimers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetGeoCountry).toHaveBeenCalled();
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

  it('surfaces an error when KycService is unavailable', async () => {
    const originalKycService = Engine.context.KycService;
    (Engine.context as { KycService?: typeof originalKycService }).KycService =
      undefined;

    try {
      const { result } = renderHook(() => useKycSessionDisclaimers());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.disclaimers).toBeNull();
      expect(result.current.error).toBe('KYC service is unavailable');
      expect(mockFetchSessionDisclaimers).not.toHaveBeenCalled();
    } finally {
      Engine.context.KycService = originalKycService;
    }
  });

  it('treats an empty catalog as an error so the CTA is not soft-locked', async () => {
    mockFetchSessionDisclaimers.mockResolvedValueOnce({
      idOS: [],
      kycProvider: [],
    });

    const { result } = renderHook(() => useKycSessionDisclaimers());

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

      const { result } = renderHook(() => useKycSessionDisclaimers());

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

    const { result } = renderHook(() => useKycSessionDisclaimers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toBeNull();
    expect(result.current.error).toBe('not signed in');
  });

  it('re-loads and clears the previous error when retry is called', async () => {
    mockFetchSessionDisclaimers
      .mockRejectedValueOnce(new Error('server error'))
      .mockResolvedValueOnce(catalog);

    const { result } = renderHook(() => useKycSessionDisclaimers());

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
