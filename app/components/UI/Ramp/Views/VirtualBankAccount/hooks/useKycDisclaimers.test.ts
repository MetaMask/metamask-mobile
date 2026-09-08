import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useKycDisclaimers } from './useKycDisclaimers';

const mockLoadDisclaimers = jest.fn();
const mockKycControllerState = {
  vendorDisclaimers: [] as { id: string; url: string; display_name: string }[],
  vendorError: null as string | null,
};

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      loadDisclaimers: (...args: unknown[]) => mockLoadDisclaimers(...args),
      get state() {
        return mockKycControllerState;
      },
    },
  },
}));

describe('useKycDisclaimers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKycControllerState.vendorDisclaimers = [];
    mockKycControllerState.vendorError = null;
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

    expect(mockLoadDisclaimers).toHaveBeenCalledWith({ country: 'BRA' });
    expect(result.current.disclaimers).toStrictEqual([
      { id: '1', url: 'https://t.c', display_name: 'T&C' },
    ]);
    expect(result.current.error).toBeNull();
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
  });
});
