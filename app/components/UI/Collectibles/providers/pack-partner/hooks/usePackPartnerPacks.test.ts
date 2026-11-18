import { act, waitFor } from '@testing-library/react-native';
import { createUIQueryClient } from '@metamask/react-data-query';
import { __setMockNetInfo } from '../../../../../../__mocks__/@react-native-community/netinfo';
import { PACK_PARTNER_ENVIRONMENT } from '../constants/environment';
import { createPackPartnerError } from '../services/errors';
import type { PackPartnerPack } from '../types/packPartner';
import {
  createPack,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { usePackPartnerPacks } from './usePackPartnerPacks';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: { context: { CollectiblesController: {} } },
}));

const GET_PACKS = 'PackPartnerDataService:getPacks';
const INVALIDATE_QUERIES = 'PackPartnerDataService:invalidateQueries';
const PACKS_KEY = [GET_PACKS, PACK_PARTNER_ENVIRONMENT];
const PACK = createPack({ priceAmount: '50000000' });

const mockGetPacks = jest.fn<Promise<PackPartnerPack[]>, unknown[]>();
const mockCall = jest.fn(
  async (action: string, ...params: unknown[]): Promise<unknown> =>
    action === GET_PACKS ? mockGetPacks(...params) : null,
);

/** UI query client reading from a mocked data-service messenger. */
const createQueryClient = () =>
  createUIQueryClient(
    ['PackPartnerDataService'],
    { call: mockCall, subscribe: jest.fn(), unsubscribe: jest.fn() },
    { defaultOptions: { queries: { gcTime: Infinity } } },
  );

const getPacksCalls = () =>
  mockCall.mock.calls.filter(([action]) => action === GET_PACKS);

const renderPacks = (
  options?: Parameters<typeof usePackPartnerPacks>[0],
  queryClient = createQueryClient(),
) =>
  renderHookWithQueryClient(() => usePackPartnerPacks(options), {
    queryClient,
  });

const goOffline = () =>
  __setMockNetInfo({ type: 'none', isInternetReachable: false });

/**
 * Lets react-query deliver, inside act, the notifications it batches on a
 * zero timeout at the end of a re-read.
 */
const settleQueries = () =>
  act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });

describe('usePackPartnerPacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPacks.mockResolvedValue([PACK]);
  });

  it('returns the open packs read from the data service', async () => {
    const { result } = renderPacks();

    await waitFor(() => expect(result.current.packs).toStrictEqual([PACK]));
    expect(mockCall).toHaveBeenCalledWith(GET_PACKS, PACK_PARTNER_ENVIRONMENT);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('caches the read under the environment key', async () => {
    const { result, queryClient } = renderPacks();

    await waitFor(() => expect(result.current.packs).toHaveLength(1));

    expect(queryClient.getQueryData(PACKS_KEY)).toStrictEqual([PACK]);
  });

  it('reports loading on the first read', async () => {
    mockGetPacks.mockReturnValue(new Promise(() => undefined));

    const { result } = renderPacks();

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.packs).toStrictEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it('maps a failed read to an error state', async () => {
    mockGetPacks.mockRejectedValue(
      createPackPartnerError({ code: 'RATE_LIMITED', retryable: true }),
    );

    const { result } = renderPacks();

    await waitFor(() =>
      expect(result.current.error?.code).toBe('RATE_LIMITED'),
    );
    expect(result.current.packs).toStrictEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('refetches by invalidating exactly the packs read', async () => {
    const { result } = renderPacks();
    await waitFor(() => expect(result.current.packs).toStrictEqual([PACK]));

    await act(async () => {
      await result.current.refetch();
    });
    await settleQueries();

    const invalidations = mockCall.mock.calls
      .filter(([action]) => action === INVALIDATE_QUERIES)
      .map(([, filters]) => filters);
    expect(invalidations).toStrictEqual([{ queryKey: PACKS_KEY, exact: true }]);
    expect(getPacksCalls()).toHaveLength(2);
  });

  it('hides previous packs and reports a failed refresh', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(PACKS_KEY, [PACK]);
    mockGetPacks.mockRejectedValue(
      createPackPartnerError({ code: 'NETWORK_ERROR', retryable: true }),
    );
    const { result } = renderPacks(undefined, queryClient);

    await act(async () => {
      await result.current.refetch();
    });
    await settleQueries();

    expect(getPacksCalls()).toHaveLength(2);
    expect(result.current.packs).toStrictEqual([]);
    expect(result.current.error?.code).toBe('NETWORK_ERROR');
  });

  it('returns a network error offline without a previous read', async () => {
    goOffline();

    const { result } = renderPacks();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.packs).toStrictEqual([]);
    expect(result.current.error).toStrictEqual({ code: 'NETWORK_ERROR' });
    expect(result.current.isLoading).toBe(false);
  });

  it('hides previous packs offline without a network read', async () => {
    goOffline();
    const queryClient = createQueryClient();
    queryClient.setQueryData(PACKS_KEY, [PACK]);

    const { result } = renderPacks(undefined, queryClient);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.packs).toStrictEqual([]);
    expect(result.current.error?.code).toBe('NETWORK_ERROR');
    expect(result.current.isOffline).toBe(true);
  });

  it('does not read when disabled', async () => {
    const { result } = renderPacks({ enabled: false });

    await act(async () => undefined);

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('reports no error offline when disabled', () => {
    goOffline();

    const { result } = renderPacks({ enabled: false });

    expect(result.current.error).toBeUndefined();
    expect(mockCall).not.toHaveBeenCalled();
  });
});
