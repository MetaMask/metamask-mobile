import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { useVendorDisclaimers } from './useVendorDisclaimers';

const VENDOR = 'iron' as const;

const mockFetchVendorDisclaimers = jest.fn();
const mockGetGeoCountry = jest.fn();
const mockAcceptVendorDisclaimers = jest.fn();
const mockRecordVendorDisclaimers = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    KycController: {
      fetchVendorDisclaimers: (...args: unknown[]) =>
        mockFetchVendorDisclaimers(...args),
      acceptVendorDisclaimers: (...args: unknown[]) =>
        mockAcceptVendorDisclaimers(...args),
      recordVendorDisclaimers: (...args: unknown[]) =>
        mockRecordVendorDisclaimers(...args),
    },
    KycService: {
      getGeoCountry: (...args: unknown[]) => mockGetGeoCountry(...args),
    },
  },
}));

const disclaimers = [{ id: '1', url: 'https://t.c', display_name: 'T&C' }];

describe('useVendorDisclaimers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchVendorDisclaimers.mockResolvedValue(disclaimers);
    mockGetGeoCountry.mockResolvedValue('BRA');
    mockAcceptVendorDisclaimers.mockReset();
    mockRecordVendorDisclaimers.mockResolvedValue([]);
  });

  it('loads vendor disclaimers through KycController', async () => {
    const { result } = renderHook(() => useVendorDisclaimers(VENDOR));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetGeoCountry).toHaveBeenCalled();
    expect(mockFetchVendorDisclaimers).toHaveBeenCalledWith({
      vendor: VENDOR,
      country: 'BRA',
    });
    expect(result.current.disclaimers).toStrictEqual(disclaimers);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error when KycService is unavailable', async () => {
    const originalKycService = Engine.context.KycService;
    (Engine.context as { KycService?: typeof originalKycService }).KycService =
      undefined;

    try {
      const { result } = renderHook(() => useVendorDisclaimers(VENDOR));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.disclaimers).toBeNull();
      expect(result.current.error).toBe('KYC service is unavailable');
      expect(mockFetchVendorDisclaimers).not.toHaveBeenCalled();
    } finally {
      Engine.context.KycService = originalKycService;
    }
  });

  it('surfaces errors returned by KycController', async () => {
    mockFetchVendorDisclaimers.mockRejectedValue(new Error('server error'));

    const { result } = renderHook(() => useVendorDisclaimers(VENDOR));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toBeNull();
    expect(result.current.error).toBe('server error');
  });

  it('treats an empty response as an error', async () => {
    mockFetchVendorDisclaimers.mockResolvedValue([]);

    const { result } = renderHook(() => useVendorDisclaimers(VENDOR));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toBeNull();
    expect(result.current.error).toBe('No KYC disclaimers returned');
  });

  it('times out when fetching disclaimers hangs', async () => {
    jest.useFakeTimers();
    try {
      mockFetchVendorDisclaimers.mockReturnValue(new Promise(() => undefined));

      const { result } = renderHook(() => useVendorDisclaimers(VENDOR));

      await act(async () => {
        jest.advanceTimersByTime(10_000);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Request timed out');
    } finally {
      jest.useRealTimers();
    }
  });

  it('reloads disclaimers when retry is called', async () => {
    mockFetchVendorDisclaimers
      .mockRejectedValueOnce(new Error('server error'))
      .mockResolvedValueOnce(disclaimers);
    const { result } = renderHook(() => useVendorDisclaimers(VENDOR));
    await waitFor(() => expect(result.current.error).toBe('server error'));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchVendorDisclaimers).toHaveBeenCalledTimes(2);
    expect(result.current.disclaimers).toStrictEqual(disclaimers);
    expect(result.current.error).toBeNull();
  });

  it('stores every displayed vendor disclaimer on the KYC controller, then sends it to kyc-api', async () => {
    const { result } = renderHook(() => useVendorDisclaimers(VENDOR));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let accepted = false;
    await act(async () => {
      accepted = await result.current.acceptDisclaimers();
    });

    expect(mockAcceptVendorDisclaimers).toHaveBeenCalledWith({
      vendor: VENDOR,
      country: 'BRA',
      disclaimerIds: ['1'],
    });
    expect(mockRecordVendorDisclaimers).toHaveBeenCalledWith({
      vendor: VENDOR,
    });
    expect(
      mockAcceptVendorDisclaimers.mock.invocationCallOrder[0],
    ).toBeLessThan(mockRecordVendorDisclaimers.mock.invocationCallOrder[0]);
    expect(accepted).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns false and surfaces an error when storing acceptance fails', async () => {
    mockAcceptVendorDisclaimers.mockImplementation(() => {
      throw new Error('Consent storage failed');
    });
    const { result } = renderHook(() => useVendorDisclaimers(VENDOR));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let accepted = true;
    await act(async () => {
      accepted = await result.current.acceptDisclaimers();
    });

    expect(accepted).toBe(false);
    expect(result.current.error).toBe('Consent storage failed');
  });

  it('returns false and surfaces an error when sending acceptance to kyc-api fails', async () => {
    mockRecordVendorDisclaimers.mockRejectedValue(new Error('kyc-api down'));
    const { result } = renderHook(() => useVendorDisclaimers(VENDOR));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let accepted = true;
    await act(async () => {
      accepted = await result.current.acceptDisclaimers();
    });

    expect(mockAcceptVendorDisclaimers).toHaveBeenCalled();
    expect(accepted).toBe(false);
    expect(result.current.error).toBe('kyc-api down');
  });
});
