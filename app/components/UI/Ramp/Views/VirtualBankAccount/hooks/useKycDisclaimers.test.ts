import { act, renderHook, waitFor } from '@testing-library/react-native';
import { VBA_KYC_VENDOR } from '../constants';
import { useKycDisclaimers } from './useKycDisclaimers';

const mockInitialize = jest.fn();
const mockLoadDisclaimers = jest.fn();
const mockFetchDisclaimersCatalog = jest.fn();
const mockReset = jest.fn();
const mockKycControllerState = {
  vendorDisclaimers: [] as { id: string; url: string; display_name: string }[],
  vendorError: null as string | null,
};

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      initialize: (...args: unknown[]) => mockInitialize(...args),
      loadDisclaimers: (...args: unknown[]) => mockLoadDisclaimers(...args),
      reset: (...args: unknown[]) => mockReset(...args),
      get state() {
        return mockKycControllerState;
      },
    },
    KycService: {
      fetchDisclaimersCatalog: (...args: unknown[]) =>
        mockFetchDisclaimersCatalog(...args),
    },
  },
}));

describe('useKycDisclaimers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycControllerState.vendorDisclaimers = [];
    mockKycControllerState.vendorError = null;
    mockInitialize.mockResolvedValue(undefined);
    mockFetchDisclaimersCatalog.mockResolvedValue({
      kycProvider: [],
      idOS: [],
    });
    mockLoadDisclaimers.mockImplementation(async () => {
      mockKycControllerState.vendorDisclaimers = [
        { id: '1', url: 'https://t.c', display_name: 'T&C' },
      ];
      mockKycControllerState.vendorError = null;
    });
  });

  it('loads Iron/MoonPay vendor disclaimers for the given country via KycController', async () => {
    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockInitialize).toHaveBeenCalledWith({ vendor: VBA_KYC_VENDOR });
    expect(mockLoadDisclaimers).toHaveBeenCalledWith({ country: 'BRA' });
    expect(mockFetchDisclaimersCatalog).toHaveBeenCalledWith({
      country: 'BRA',
    });
    expect(result.current.disclaimers).toStrictEqual([
      { id: '1', url: 'https://t.c', display_name: 'T&C' },
    ]);
    expect(result.current.error).toBeNull();
  });

  it('returns SumSub and idOS consent records with their legal links', async () => {
    mockFetchDisclaimersCatalog.mockResolvedValue({
      kycProvider: [
        {
          key: 'sumsub-terms',
          version: '1',
          title: 'SumSub terms',
          url: 'https://example.com/sumsub',
        },
      ],
      idOS: [
        {
          key: 'idos-terms',
          version: '2',
          title: 'idOS terms',
          url: 'https://example.com/idos',
        },
      ],
    });

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toStrictEqual([
      { id: '1', url: 'https://t.c', display_name: 'T&C' },
      {
        id: 'sumsub-terms',
        display_name: 'SumSub terms',
        url: 'https://example.com/sumsub',
      },
      {
        id: 'idos-terms',
        display_name: 'idOS terms',
        url: 'https://example.com/idos',
      },
    ]);
    expect(result.current.providerDisclaimersAccepted).toStrictEqual([
      { key: 'sumsub-terms', version: '1' },
    ]);
    expect(result.current.idosDisclaimersAccepted).toStrictEqual([
      { key: 'idos-terms', version: '2' },
    ]);
  });

  it('surfaces vendorError from KycController state when the load fails', async () => {
    mockLoadDisclaimers.mockImplementation(async () => {
      mockKycControllerState.vendorDisclaimers = [];
      mockKycControllerState.vendorError =
        'Failed to load disclaimers: Error: boom';
    });

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toBeNull();
    expect(result.current.error).toBe(
      'Failed to load disclaimers: Error: boom',
    );
  });

  it('treats an empty successful response as an error so the CTA is not soft-locked', async () => {
    mockLoadDisclaimers.mockImplementation(async () => {
      mockKycControllerState.vendorDisclaimers = [];
      mockKycControllerState.vendorError = null;
    });

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toBeNull();
    expect(result.current.error).toBe('No KYC disclaimers returned');
  });

  it('times out when loadDisclaimers hangs', async () => {
    jest.useFakeTimers();
    try {
      mockLoadDisclaimers.mockReturnValueOnce(new Promise(() => undefined));

      const { result } = renderHook(() => useKycDisclaimers('BRA'));

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

  it('propagates thrown errors from loadDisclaimers', async () => {
    mockLoadDisclaimers.mockRejectedValueOnce(new Error('not signed in'));

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toBeNull();
    expect(result.current.error).toBe('not signed in');
  });

  it('re-loads and clears the previous error when retry is called', async () => {
    mockLoadDisclaimers
      .mockImplementationOnce(async () => {
        mockKycControllerState.vendorDisclaimers = [];
        mockKycControllerState.vendorError = 'server error';
      })
      .mockImplementationOnce(async () => {
        mockKycControllerState.vendorDisclaimers = [
          { id: '1', url: 'https://t.c', display_name: 'T&C' },
        ];
        mockKycControllerState.vendorError = null;
      });

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('server error');

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.disclaimers).toStrictEqual([
      { id: '1', url: 'https://t.c', display_name: 'T&C' },
    ]);
    expect(mockLoadDisclaimers).toHaveBeenCalledTimes(2);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('invalidates a superseded in-flight load so it cannot overwrite the retry result', async () => {
    let settleFirstLoad = () => undefined as void;
    mockLoadDisclaimers
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            settleFirstLoad = () => {
              mockKycControllerState.vendorDisclaimers = [];
              mockKycControllerState.vendorError = 'stale server error';
              resolve();
            };
          }),
      )
      .mockImplementationOnce(async () => {
        mockKycControllerState.vendorDisclaimers = [
          { id: '1', url: 'https://t.c', display_name: 'T&C' },
        ];
        mockKycControllerState.vendorError = null;
      });

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    await waitFor(() => expect(mockLoadDisclaimers).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockReset).toHaveBeenCalledTimes(1);

    await act(async () => {
      settleFirstLoad();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.disclaimers).toStrictEqual([
      { id: '1', url: 'https://t.c', display_name: 'T&C' },
    ]);
  });
});
