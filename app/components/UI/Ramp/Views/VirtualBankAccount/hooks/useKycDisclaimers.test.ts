import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engine from '../../../../../../core/Engine';
import { VBA_KYC_VENDOR } from '../constants';
import { prefetchVbaVendorDisclaimers } from '../vbaVendorDisclaimersQuery';
import { useKycDisclaimers } from './useKycDisclaimers';

const mockFetchVendorDisclaimers = jest.fn();
const mockGetGeoCountry = jest.fn();
const mockGetState = jest.fn();
const mockSaveVbaVendorTermsAcceptance = jest.fn();

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    KycController: {
      fetchVendorDisclaimers: (...args: unknown[]) =>
        mockFetchVendorDisclaimers(...args),
    },
    KycService: {
      getGeoCountry: (...args: unknown[]) => mockGetGeoCountry(...args),
    },
  },
}));

jest.mock('../../../../../../core/redux', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

jest.mock('../../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: jest.fn(
    (state: { address?: string }) => state.address ?? null,
  ),
}));

jest.mock('../../../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: { queryClient: undefined },
}));

jest.mock('../../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../vbaVendorTermsStorage', () => ({
  saveVbaVendorTermsAcceptance: (...args: unknown[]) =>
    mockSaveVbaVendorTermsAcceptance(...args),
}));

const disclaimers = [{ id: '1', url: 'https://t.c', display_name: 'T&C' }];

let queryClient: QueryClient;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const renderUseKycDisclaimers = () =>
  renderHook(() => useKycDisclaimers(), { wrapper });

afterEach(() => {
  queryClient.clear();
});

describe('useKycDisclaimers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    mockFetchVendorDisclaimers.mockResolvedValue(disclaimers);
    mockGetGeoCountry.mockResolvedValue('BRA');
    mockGetState.mockReturnValue({ address: '0xabc' });
    mockSaveVbaVendorTermsAcceptance.mockResolvedValue(undefined);
  });

  it('loads vendor disclaimers through KycController', async () => {
    const { result } = renderUseKycDisclaimers();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetGeoCountry).toHaveBeenCalled();
    expect(mockFetchVendorDisclaimers).toHaveBeenCalledWith({
      vendor: VBA_KYC_VENDOR,
      country: 'BRA',
    });
    expect(result.current.disclaimers).toStrictEqual(disclaimers);
    expect(result.current.error).toBeNull();
  });

  it('returns prefetched disclaimers on the first render without loading again', async () => {
    await prefetchVbaVendorDisclaimers(queryClient);
    expect(mockFetchVendorDisclaimers).toHaveBeenCalledTimes(1);

    const { result } = renderUseKycDisclaimers();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.disclaimers).toStrictEqual(disclaimers);
    expect(result.current.error).toBeNull();
    expect(mockFetchVendorDisclaimers).toHaveBeenCalledTimes(1);
  });

  it('joins a prefetch that is still in flight instead of starting another', async () => {
    let resolveFetch: (value: typeof disclaimers) => void = () => undefined;
    mockFetchVendorDisclaimers.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const prefetch = prefetchVbaVendorDisclaimers(queryClient);

    const { result } = renderUseKycDisclaimers();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.disclaimers).toBeNull();

    await act(async () => {
      resolveFetch(disclaimers);
      await prefetch;
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.disclaimers).toStrictEqual(disclaimers);
    expect(mockFetchVendorDisclaimers).toHaveBeenCalledTimes(1);
  });

  it('loads again on open when the prefetch failed', async () => {
    mockFetchVendorDisclaimers
      .mockRejectedValueOnce(new Error('server error'))
      .mockResolvedValueOnce(disclaimers);
    await prefetchVbaVendorDisclaimers(queryClient);

    const { result } = renderUseKycDisclaimers();

    await waitFor(() =>
      expect(result.current.disclaimers).toStrictEqual(disclaimers),
    );
    expect(result.current.error).toBeNull();
    expect(mockFetchVendorDisclaimers).toHaveBeenCalledTimes(2);
  });

  it('surfaces an error when KycService is unavailable', async () => {
    const originalKycService = Engine.context.KycService;
    (Engine.context as { KycService?: typeof originalKycService }).KycService =
      undefined;

    try {
      const { result } = renderUseKycDisclaimers();

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

    const { result } = renderUseKycDisclaimers();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toBeNull();
    expect(result.current.error).toBe('server error');
  });

  it('treats an empty response as an error', async () => {
    mockFetchVendorDisclaimers.mockResolvedValue([]);

    const { result } = renderUseKycDisclaimers();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.disclaimers).toBeNull();
    expect(result.current.error).toBe('No KYC disclaimers returned');
  });

  it('times out when fetching disclaimers hangs', async () => {
    jest.useFakeTimers();
    try {
      mockFetchVendorDisclaimers.mockReturnValue(new Promise(() => undefined));

      const { result } = renderUseKycDisclaimers();

      await act(async () => {
        jest.advanceTimersByTime(10_000);
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.error).toBe('Request timed out');
    } finally {
      jest.useRealTimers();
    }
  });

  it('reloads disclaimers when retry is called', async () => {
    mockFetchVendorDisclaimers
      .mockRejectedValueOnce(new Error('server error'))
      .mockResolvedValueOnce(disclaimers);
    const { result } = renderUseKycDisclaimers();
    await waitFor(() => expect(result.current.error).toBe('server error'));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchVendorDisclaimers).toHaveBeenCalledTimes(2);
    expect(result.current.disclaimers).toStrictEqual(disclaimers);
    expect(result.current.error).toBeNull();
  });

  it('stores every displayed vendor disclaimer locally for the selected wallet', async () => {
    const { result } = renderUseKycDisclaimers();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let accepted = false;
    await act(async () => {
      accepted = await result.current.acceptDisclaimers();
    });

    expect(mockSaveVbaVendorTermsAcceptance).toHaveBeenCalledWith('0xabc', [
      '1',
    ]);
    expect(accepted).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('returns false and surfaces an error when storing acceptance fails', async () => {
    mockSaveVbaVendorTermsAcceptance.mockRejectedValue(
      new Error('Consent storage failed'),
    );
    const { result } = renderUseKycDisclaimers();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let accepted = true;
    await act(async () => {
      accepted = await result.current.acceptDisclaimers();
    });

    expect(accepted).toBe(false);
    expect(result.current.error).toBe('Consent storage failed');
  });
});
