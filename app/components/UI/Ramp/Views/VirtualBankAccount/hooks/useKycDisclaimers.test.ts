import { renderHook, waitFor } from '@testing-library/react-native';
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
});
