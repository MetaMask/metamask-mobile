import { act, waitFor } from '@testing-library/react-native';
import { createUIQueryClient } from '@metamask/react-data-query';
import Engine from '../../../../../../core/Engine';
import { __setMockNetInfo } from '../../../../../../__mocks__/@react-native-community/netinfo';
import { PACK_PARTNER_ENVIRONMENT } from '../constants';
import { createPackPartnerError } from '../services/errors';
import type { PackPartnerBuyback } from '../types';
import {
  MOCK_ACCOUNT,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import {
  getBuybackDisplay,
  useBuybackOffer,
  useBuybackOffers,
  type BuybackDisplay,
} from './useBuybackOffer';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CollectiblesController: {
        checkSales: jest.fn(),
        recoverOperations: jest.fn(),
      },
    },
  },
}));

const GET_BUYBACK_OFFER = 'PackPartnerDataService:getBuybackOffer';
const AVAILABLE: PackPartnerBuyback = {
  status: 'available',
  amount: '42500000',
};

const controller = jest.mocked(Engine.context.CollectiblesController);
const mockGetBuybackOffer = jest.fn<Promise<PackPartnerBuyback>, unknown[]>();
const mockCall = jest.fn(
  async (action: string, ...params: unknown[]): Promise<unknown> =>
    action === GET_BUYBACK_OFFER ? mockGetBuybackOffer(...params) : null,
);

/** UI query client reading from a mocked data-service messenger. */
const createQueryClient = () =>
  createUIQueryClient(
    ['PackPartnerDataService'],
    { call: mockCall, subscribe: jest.fn(), unsubscribe: jest.fn() },
    { defaultOptions: { queries: { gcTime: Infinity } } },
  );

const getOfferCalls = () =>
  mockCall.mock.calls.filter(([action]) => action === GET_BUYBACK_OFFER);

const renderOffer = (
  params: Partial<Parameters<typeof useBuybackOffer>[0]> = {},
) =>
  renderHookWithQueryClient(
    () =>
      useBuybackOffer({
        account: MOCK_ACCOUNT,
        mint: 'MintA',
        enabled: true,
        ...params,
      }),
    { queryClient: createQueryClient() },
  );

describe('getBuybackDisplay', () => {
  it.each<
    [
      string,
      PackPartnerBuyback | undefined,
      Parameters<typeof getBuybackDisplay>[1],
      BuybackDisplay,
    ]
  >([
    [
      'the offer when available',
      AVAILABLE,
      { hasFailed: false },
      { status: 'available', amount: '42500000' },
    ],
    [
      'unavailable when the card has no offer',
      { status: 'unavailable' },
      { hasFailed: false },
      { status: 'unavailable' },
    ],
    [
      'an error when the read failed',
      { status: 'unknown' },
      { hasFailed: true },
      { status: 'error' },
    ],
    [
      'an error over a previously read offer',
      AVAILABLE,
      { hasFailed: true },
      { status: 'error' },
    ],
    [
      'checking while the offer is not read',
      undefined,
      { hasFailed: false },
      { status: 'checking' },
    ],
    [
      'checking while the offer is unknown',
      { status: 'unknown' },
      { hasFailed: false },
      { status: 'checking' },
    ],
    [
      'checking for an available offer without amount',
      { status: 'available' },
      { hasFailed: false },
      { status: 'checking' },
    ],
    [
      'checking while the read runs, over a previous offer',
      AVAILABLE,
      { hasFailed: true, isChecking: true },
      { status: 'checking' },
    ],
    [
      'the pending sale over any offer',
      AVAILABLE,
      { hasFailed: false, isChecking: true, isSalePending: true },
      { status: 'pending', hasFailed: false },
    ],
    [
      'the pending sale before any offer read',
      undefined,
      { hasFailed: false, isSalePending: true },
      { status: 'pending', hasFailed: false },
    ],
  ])('returns %s', (_label, buyback, options, expected) => {
    const display = getBuybackDisplay(buyback, options);

    expect(display).toStrictEqual(expected);
  });
});

describe('useBuybackOffer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBuybackOffer.mockResolvedValue(AVAILABLE);
    controller.checkSales.mockResolvedValue(undefined);
  });

  it('reads the offer of the card from the data service', async () => {
    const { result } = renderOffer();

    await waitFor(() => expect(result.current.offer).toStrictEqual(AVAILABLE));
    expect(mockCall).toHaveBeenCalledWith(
      GET_BUYBACK_OFFER,
      PACK_PARTNER_ENVIRONMENT,
      'MintA',
    );
    expect(result.current.isChecking).toBe(false);
    expect(result.current.hasFailed).toBe(false);
  });

  it('caches the offer under the environment and mint key', async () => {
    const { result, queryClient } = renderOffer();

    await waitFor(() => expect(result.current.offer).toBeDefined());
    expect(
      queryClient.getQueryData([
        GET_BUYBACK_OFFER,
        PACK_PARTNER_ENVIRONMENT,
        'MintA',
      ]),
    ).toStrictEqual(AVAILABLE);
  });

  it('reports checking while the offer is read', async () => {
    mockGetBuybackOffer.mockReturnValue(new Promise(() => undefined));

    const { result } = renderOffer();

    await waitFor(() => expect(result.current.isChecking).toBe(true));
    expect(result.current.offer).toBeUndefined();
    expect(result.current.hasFailed).toBe(false);
  });

  it('reports a failed read without inventing an offer', async () => {
    mockGetBuybackOffer.mockRejectedValue(
      createPackPartnerError({ code: 'NETWORK_ERROR' }),
    );

    const { result } = renderOffer();

    await waitFor(() => expect(result.current.hasFailed).toBe(true));
    expect(result.current.offer).toBeUndefined();
    expect(result.current.isChecking).toBe(false);
  });

  it('reads the offer again on retry', async () => {
    const { result } = renderOffer();
    await waitFor(() => expect(result.current.offer).toBeDefined());
    mockGetBuybackOffer.mockResolvedValue({ status: 'unavailable' });

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() =>
      expect(result.current.offer).toStrictEqual({ status: 'unavailable' }),
    );
    expect(getOfferCalls()).toHaveLength(2);
    expect(controller.checkSales).not.toHaveBeenCalled();
  });

  it('does not read the offer while a sale of the card is pending', async () => {
    const { result } = renderOffer({ isSalePending: true });

    await act(async () => undefined);

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.offer).toBeUndefined();
    expect(result.current.isChecking).toBe(false);
    expect(result.current.hasFailed).toBe(false);
  });

  it('does not report an earlier read failure once a sale of the card is pending', async () => {
    mockGetBuybackOffer.mockRejectedValue(
      createPackPartnerError({ code: 'NETWORK_ERROR' }),
    );
    let isSalePending = false;
    const { result, rerender } = renderHookWithQueryClient(
      () =>
        useBuybackOffer({
          account: MOCK_ACCOUNT,
          mint: 'MintA',
          enabled: true,
          isSalePending,
        }),
      { queryClient: createQueryClient() },
    );
    await waitFor(() => expect(result.current.hasFailed).toBe(true));

    isSalePending = true;
    rerender({});

    expect(result.current.hasFailed).toBe(false);
    expect(result.current.isChecking).toBe(false);
  });

  it('checks the pending sales of the account on retry, without reading the offer or recovering purchases', async () => {
    const { result } = renderOffer({ isSalePending: true });

    await act(async () => {
      await result.current.retry();
    });

    expect(controller.checkSales).toHaveBeenCalledTimes(1);
    expect(controller.checkSales).toHaveBeenCalledWith({
      address: MOCK_ACCOUNT.address,
    });
    expect(controller.recoverOperations).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('reports checking while the pending sale is checked', async () => {
    let resolveCheck: () => void = () => undefined;
    controller.checkSales.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveCheck = resolve;
      }),
    );
    const { result } = renderOffer({ isSalePending: true });

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.retry();
    });

    expect(result.current.isChecking).toBe(true);
    expect(result.current.hasFailed).toBe(false);
    await act(async () => {
      resolveCheck();
      await pending;
    });
    expect(result.current.isChecking).toBe(false);
  });

  it.each<[string, Partial<Parameters<typeof useBuybackOffer>[0]>]>([
    ['the offer is not shown', { enabled: false }],
    ['without an account', { account: undefined }],
    ['without a mint', { mint: undefined }],
    [
      'without an account, for a pending sale',
      { account: undefined, isSalePending: true },
    ],
  ])('does nothing when %s', async (_label, params) => {
    const { result } = renderOffer(params);

    await act(async () => {
      await result.current.retry();
    });

    expect(mockCall).not.toHaveBeenCalled();
    expect(controller.checkSales).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      offer: undefined,
      isChecking: false,
      hasFailed: false,
    });
  });

  it('does nothing while offline', async () => {
    __setMockNetInfo({ type: 'none', isInternetReachable: false });

    const { result } = renderOffer();

    await act(async () => {
      await result.current.retry();
    });

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.hasFailed).toBe(false);
  });
});

describe('useBuybackOffers', () => {
  const MINTS = ['MintA', 'MintB', 'MintC'];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBuybackOffer.mockImplementation(async (_environment, mint) => {
      if (mint === 'MintA') return AVAILABLE;
      if (mint === 'MintB') return { status: 'unavailable' };
      throw createPackPartnerError({ code: 'NETWORK_ERROR' });
    });
  });

  it('returns the offers read so far, by mint, without failed reads', async () => {
    const { result } = renderHookWithQueryClient(
      () => useBuybackOffers(MINTS, true),
      { queryClient: createQueryClient() },
    );

    await waitFor(() =>
      expect(result.current).toStrictEqual({
        MintA: AVAILABLE,
        MintB: { status: 'unavailable' },
      }),
    );
    expect(getOfferCalls().map(([, ...params]) => params)).toStrictEqual(
      MINTS.map((mint) => [PACK_PARTNER_ENVIRONMENT, mint]),
    );
  });

  it('returns a cached offer stored under the useBuybackOffer key, without reading', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(
      [GET_BUYBACK_OFFER, PACK_PARTNER_ENVIRONMENT, 'MintA'],
      AVAILABLE,
    );

    const { result } = renderHookWithQueryClient(
      () => useBuybackOffers(['MintA'], false),
      { queryClient },
    );

    expect(result.current).toStrictEqual({ MintA: AVAILABLE });
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not read when disabled', async () => {
    const { result } = renderHookWithQueryClient(
      () => useBuybackOffers(MINTS, false),
      { queryClient: createQueryClient() },
    );

    await act(async () => undefined);

    expect(result.current).toStrictEqual({});
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not read while offline', async () => {
    __setMockNetInfo({ type: 'none', isInternetReachable: false });

    const { result } = renderHookWithQueryClient(
      () => useBuybackOffers(MINTS, true),
      { queryClient: createQueryClient() },
    );

    await act(async () => undefined);

    expect(result.current).toStrictEqual({});
    expect(mockCall).not.toHaveBeenCalled();
  });
});
