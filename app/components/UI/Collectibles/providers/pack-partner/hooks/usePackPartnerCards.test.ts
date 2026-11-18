import { act, waitFor } from '@testing-library/react-native';
import { createUIQueryClient } from '@metamask/react-data-query';
import type { DataServiceGranularCacheUpdatedPayload } from '@metamask/base-data-service';
import {
  QueryClient,
  dehydrate,
  hashKey,
  type QueryKey,
} from '@tanstack/react-query';
import Engine from '../../../../../../core/Engine';
import { updateBgState } from '../../../../../../core/redux/slices/engine';
import type { RootState } from '../../../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import type { DeepPartial } from '../../../../../../util/test/renderWithProvider';
import { __setMockNetInfo } from '../../../../../../__mocks__/@react-native-community/netinfo';
import { PACK_PARTNER_ENVIRONMENT } from '../constants';
import { createPackPartnerError } from '../services/errors';
import type {
  PackPartnerBuybackOperation,
  PackPartnerBuyback,
  PackPartnerCard,
} from '../types';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  createCard,
  createTestState,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { usePackPartnerCard, usePackPartnerCards } from './usePackPartnerCards';
import { usePackPartnerCardOffers } from './usePackPartnerCardOffers';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: { context: { CollectiblesController: {} } },
}));

jest.mock('../../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual(
    '../../../../../../selectors/multichainAccounts/accounts',
  ),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

const GET_OWNED_CARDS = 'PackPartnerDataService:getOwnedCards';
const GET_BUYBACK_OFFER = 'PackPartnerDataService:getBuybackOffer';
const INVALIDATE_QUERIES = 'PackPartnerDataService:invalidateQueries';
const OWNED_CARDS_KEY = [
  GET_OWNED_CARDS,
  PACK_PARTNER_ENVIRONMENT,
  MOCK_ACCOUNT.address,
];
const offerKey = (mint: string) => [
  GET_BUYBACK_OFFER,
  PACK_PARTNER_ENVIRONMENT,
  mint,
];

const AVAILABLE: PackPartnerBuyback = {
  status: 'available',
  amount: '42500000',
};
const LOWER_OFFER: PackPartnerBuyback = {
  status: 'available',
  amount: '40000000',
};

type CacheListener = (payload: DataServiceGranularCacheUpdatedPayload) => void;

const cacheListeners = new Map<string, CacheListener>();
const mockAccountByScope = jest.fn();
const mockGetOwnedCards = jest.fn<Promise<PackPartnerCard[]>, unknown[]>();
const mockGetBuybackOffer = jest.fn<Promise<PackPartnerBuyback>, unknown[]>();
const mockCall = jest.fn(
  async (action: string, ...params: unknown[]): Promise<unknown> => {
    if (action === GET_OWNED_CARDS) return mockGetOwnedCards(...params);
    if (action === GET_BUYBACK_OFFER) return mockGetBuybackOffer(...params);
    return null;
  },
);

/** UI query client reading from a mocked data-service messenger. */
const createQueryClient = () =>
  createUIQueryClient(
    ['PackPartnerDataService'],
    {
      call: mockCall,
      subscribe: (event: string, listener: CacheListener) => {
        cacheListeners.set(event, listener);
      },
      unsubscribe: (event: string) => {
        cacheListeners.delete(event);
      },
    },
    { defaultOptions: { queries: { gcTime: Infinity } } },
  );

/**
 * Publishes a newer background read of a key, as the data service does after
 * it re-reads an entry (`cacheUpdated:<hash>`).
 *
 * @param queryKey - Key of the read.
 * @param data - Newer data.
 */
const publishCacheUpdate = (queryKey: QueryKey, data: unknown): void => {
  const background = new QueryClient();
  background.setQueryData(queryKey, data, { updatedAt: Date.now() + 60_000 });
  const event = `PackPartnerDataService:cacheUpdated:${hashKey(queryKey)}`;
  const listener = cacheListeners.get(event);
  if (!listener) throw new Error(`Nothing listens to ${event}`);
  listener({
    objectType: 'query',
    type: 'updated',
    state: dehydrate(background),
  });
  background.clear();
};

/** Redux state with the buyback operations of MOCK_ACCOUNT. */
const createSalesState = (
  sales: Record<string, PackPartnerBuybackOperation>,
): DeepPartial<RootState> => {
  const state = createTestState();
  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...state.engine?.backgroundState,
        CollectiblesController: {
          hasCompletedOnboarding: true,
          packPartner: {
            operations: {},
            sales: { [MOCK_ACCOUNT.address]: sales },
          },
        },
      },
    },
  };
};

const createSale = (
  overrides: Partial<PackPartnerBuybackOperation> = {},
): PackPartnerBuybackOperation => ({
  mint: 'MintNew',
  memo: 'sale-memo',
  status: 'pending',
  amount: '42500000',
  submissionAttempted: true,
  createdAt: 5_000,
  updatedAt: 6_000,
  ...overrides,
});

/** Within the buyback window: its offer is read on its own. */
const NEW_CARD = createCard({ mint: 'MintNew', acquiredAt: 2 });
/** Past the buyback window: the data service already says unavailable. */
const OLD_CARD = createCard({
  mint: 'MintOld',
  acquiredAt: 1,
  buyback: { status: 'unavailable' },
});

const getOwnedCardsCalls = () =>
  mockCall.mock.calls.filter(([action]) => action === GET_OWNED_CARDS);
const getOfferReads = () =>
  mockCall.mock.calls
    .filter(([action]) => action === GET_BUYBACK_OFFER)
    .map(([, ...params]) => params);
const getInvalidations = () =>
  mockCall.mock.calls
    .filter(([action]) => action === INVALIDATE_QUERIES)
    .map(([, filters]) => filters);

const renderCards = (
  hook: () => ReturnType<typeof usePackPartnerCards> = usePackPartnerCards,
  {
    state,
    queryClient = createQueryClient(),
  }: { state?: DeepPartial<RootState>; queryClient?: QueryClient } = {},
) =>
  renderHookWithQueryClient(hook, {
    queryClient,
    ...(state ? { state } : {}),
  });

/** Collection composes offers explicitly for its eligibility filter/count. */
const useCardsWithOffers = () => {
  const state = usePackPartnerCards();
  const cards = usePackPartnerCardOffers(state.cards, Boolean(state.account));
  return { ...state, cards };
};

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

describe('usePackPartnerCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheListeners.clear();
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(mockAccountByScope);
    mockAccountByScope.mockReturnValue(MOCK_INTERNAL_ACCOUNT);
    mockGetOwnedCards.mockResolvedValue([NEW_CARD, OLD_CARD]);
    // Offer reads stay unanswered unless a scenario answers them.
    mockGetBuybackOffer.mockReturnValue(new Promise(() => undefined));
  });

  it('returns the owned cards read from the data service for the selected account', async () => {
    const { result } = renderCards();

    await waitFor(() => expect(result.current.cards).toHaveLength(2));

    expect(mockCall).toHaveBeenCalledWith(
      GET_OWNED_CARDS,
      PACK_PARTNER_ENVIRONMENT,
      MOCK_ACCOUNT.address,
    );
    expect(getOfferReads()).toStrictEqual([]);
    expect(result.current).toStrictEqual({
      account: MOCK_ACCOUNT,
      cards: [NEW_CARD, OLD_CARD],
      hasLoaded: true,
      isLoading: false,
      error: undefined,
      refetch: expect.any(Function),
    });
  });

  it('does not carry a previous account snapshot into a newly selected account', async () => {
    const { result, store } = renderCards();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const nextAccount = {
      ...MOCK_INTERNAL_ACCOUNT,
      id: 'second-account',
      address: 'AnotherWallet1111111111111111111111111111111',
    };
    mockAccountByScope.mockReturnValue(nextAccount);
    mockGetOwnedCards.mockReturnValue(new Promise(() => undefined));

    Object.assign(Engine, { state: store.getState().engine.backgroundState });
    act(() => {
      store.dispatch(updateBgState({ key: 'AccountsController' }));
    });

    await waitFor(() =>
      expect(result.current.account?.address).toBe(nextAccount.address),
    );
    expect(result.current.cards).toEqual([]);
    expect(result.current.hasLoaded).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('caches the read under the environment and address key', async () => {
    const { result, queryClient } = renderCards();

    await waitFor(() => expect(result.current.cards).toHaveLength(2));

    expect(queryClient.getQueryData(OWNED_CARDS_KEY)).toStrictEqual([
      NEW_CARD,
      OLD_CARD,
    ]);
  });

  it('reports loading while the first read runs', async () => {
    mockGetOwnedCards.mockReturnValue(new Promise(() => undefined));

    const { result } = renderCards();

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.cards).toStrictEqual([]);
    expect(result.current.error).toBeUndefined();
  });

  it('reads the offer of each card whose buyback is unknown and shows it on the card', async () => {
    mockGetBuybackOffer.mockResolvedValue(AVAILABLE);

    const { result } = renderCards(useCardsWithOffers);

    await waitFor(() =>
      expect(result.current.cards[0]?.buyback).toStrictEqual(AVAILABLE),
    );
    expect(result.current.cards).toStrictEqual([
      { ...NEW_CARD, buyback: AVAILABLE },
      OLD_CARD,
    ]);
    expect(getOfferReads()).toStrictEqual([
      [PACK_PARTNER_ENVIRONMENT, 'MintNew'],
    ]);
  });

  it('does not show a cached offer on a card past the buyback window', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(offerKey('MintOld'), AVAILABLE);

    const { result } = renderCards(useCardsWithOffers, { queryClient });

    await waitFor(() => expect(result.current.cards).toHaveLength(2));
    expect(result.current.cards[1]).toStrictEqual(OLD_CARD);
    expect(getOfferReads()).toStrictEqual([
      [PACK_PARTNER_ENVIRONMENT, 'MintNew'],
    ]);
  });

  it('re-renders the card when its offer read changes', async () => {
    mockGetBuybackOffer.mockResolvedValue(AVAILABLE);
    const { result } = renderCards(useCardsWithOffers);
    await waitFor(() =>
      expect(result.current.cards[0]?.buyback).toStrictEqual(AVAILABLE),
    );

    act(() => publishCacheUpdate(offerKey('MintNew'), LOWER_OFFER));

    await waitFor(() =>
      expect(result.current.cards[0]).toStrictEqual({
        ...NEW_CARD,
        buyback: LOWER_OFFER,
      }),
    );
    expect(result.current.cards[1]).toStrictEqual(OLD_CARD);
  });

  it('keeps the current offer, never an earlier one, when the owned cards are read again', async () => {
    mockGetBuybackOffer.mockResolvedValue(AVAILABLE);
    const { result } = renderCards(useCardsWithOffers);
    await waitFor(() =>
      expect(result.current.cards[0]?.buyback).toStrictEqual(AVAILABLE),
    );
    mockGetBuybackOffer.mockResolvedValue(LOWER_OFFER);
    act(() => publishCacheUpdate(offerKey('MintNew'), LOWER_OFFER));
    await waitFor(() =>
      expect(result.current.cards[0]?.buyback).toStrictEqual(LOWER_OFFER),
    );

    await act(async () => {
      await result.current.refetch();
    });
    await settleQueries();

    expect(getOwnedCardsCalls()).toHaveLength(2);
    expect(result.current.cards[0]).toStrictEqual({
      ...NEW_CARD,
      buyback: LOWER_OFFER,
    });
  });

  it('keeps the unknown buyback of a card whose offer read fails, without failing the list', async () => {
    mockGetBuybackOffer.mockRejectedValue(
      createPackPartnerError({ code: 'NETWORK_ERROR' }),
    );
    const { result, queryClient } = renderCards(useCardsWithOffers);

    await waitFor(() =>
      expect(queryClient.getQueryState(offerKey('MintNew'))?.status).toBe(
        'error',
      ),
    );

    expect(result.current.cards).toStrictEqual([NEW_CARD, OLD_CARD]);
    expect(result.current.error).toBeUndefined();
  });

  it('shows the pending sale of a card from the buyback journal', async () => {
    const sale = createSale({ mint: 'MintNew' });

    const { result } = renderCards(undefined, {
      state: createSalesState({ MintNew: sale }),
    });

    await waitFor(() => expect(result.current.cards).toHaveLength(2));
    expect(result.current.cards[0]).toStrictEqual({
      ...NEW_CARD,
      sale: { status: 'pending', amount: '42500000', updatedAt: 6_000 },
    });
    expect(result.current.cards[1]).toBe(OLD_CARD);
  });

  it('keeps a sold card listed while the server snapshot still returns it', async () => {
    const sale = createSale({
      mint: 'MintNew',
      status: 'completed',
      signature: 'sale-signature',
    });

    const { result } = renderCards(undefined, {
      state: createSalesState({ MintNew: sale }),
    });

    await waitFor(() => expect(result.current.cards).toHaveLength(2));
    expect(result.current.cards.map((card) => card.mint)).toStrictEqual([
      'MintNew',
      'MintOld',
    ]);
    expect(result.current.cards[0].sale).toStrictEqual({
      status: 'completed',
      amount: '42500000',
      signature: 'sale-signature',
      updatedAt: 6_000,
    });
  });

  it('lists exactly the cards of the server snapshot', async () => {
    mockGetOwnedCards.mockResolvedValue([OLD_CARD]);
    const sale = createSale({ mint: 'MintNew' });

    const { result } = renderCards(undefined, {
      state: createSalesState({ MintNew: sale }),
    });

    await waitFor(() => expect(result.current.cards).toHaveLength(1));
    expect(result.current.cards).toStrictEqual([OLD_CARD]);
  });

  it('maps a failed read to an error state', async () => {
    mockGetOwnedCards.mockRejectedValue(
      createPackPartnerError({ code: 'RATE_LIMITED' }),
    );

    const { result } = renderCards();

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error).toStrictEqual({ code: 'RATE_LIMITED' });
    expect(result.current.cards).toStrictEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('does not expose the raw message of an unexpected read failure', async () => {
    mockGetOwnedCards.mockRejectedValue(new Error('Unexpected payload'));

    const { result } = renderCards();

    await waitFor(() =>
      expect(result.current.error).toStrictEqual({
        code: 'UNKNOWN',
      }),
    );
  });

  it('refetches by invalidating exactly the owned-cards read of the account', async () => {
    const { result } = renderCards();
    await waitFor(() => expect(result.current.cards).toHaveLength(2));

    await act(async () => {
      await result.current.refetch();
    });
    await settleQueries();

    expect(getInvalidations()).toStrictEqual([
      { queryKey: OWNED_CARDS_KEY, exact: true },
    ]);
    expect(getOwnedCardsCalls()).toHaveLength(2);
  });

  it('returns a network error offline when disk has no collection', async () => {
    goOffline();
    mockGetOwnedCards.mockRejectedValue(
      createPackPartnerError({ code: 'NETWORK_ERROR' }),
    );

    const { result } = renderCards();

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() =>
      expect(result.current.error).toStrictEqual({ code: 'NETWORK_ERROR' }),
    );
    expect(getOwnedCardsCalls()).toHaveLength(1);
    expect(result.current.cards).toStrictEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('restores the previous collection offline through the service', async () => {
    goOffline();
    const queryClient = createQueryClient();
    queryClient.setQueryData(OWNED_CARDS_KEY, [NEW_CARD, OLD_CARD]);

    const { result } = renderCards(undefined, { queryClient });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getOwnedCardsCalls()).toHaveLength(1);
    expect(result.current.cards).toStrictEqual([NEW_CARD, OLD_CARD]);
    expect(result.current.error).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('skips force refresh offline while retaining the loaded collection', async () => {
    const { result, rerender } = renderCards();
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));
    const reads = getOwnedCardsCalls().length;
    goOffline();
    // The native NetInfo stub is synchronous; rerender to observe its new value.
    rerender({});

    await act(async () => {
      await result.current.refetch();
    });

    expect(getInvalidations()).toEqual([]);
    expect(getOwnedCardsCalls()).toHaveLength(reads);
    expect(result.current.cards).toEqual([NEW_CARD, OLD_CARD]);
  });

  it('does not read when disabled', async () => {
    const { result } = renderCards(() =>
      usePackPartnerCards({ enabled: false }),
    );

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('reports no error offline when disabled', () => {
    goOffline();

    const { result } = renderCards(() =>
      usePackPartnerCards({ enabled: false }),
    );

    expect(result.current.error).toBeUndefined();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('does not read without a Solana account', async () => {
    mockAccountByScope.mockReturnValue(undefined);

    const { result } = renderCards();

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.account).toBeUndefined();
    expect(result.current.cards).toStrictEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(mockCall).not.toHaveBeenCalled();
  });
});

describe('usePackPartnerCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheListeners.clear();
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(mockAccountByScope);
    mockAccountByScope.mockReturnValue(MOCK_INTERNAL_ACCOUNT);
    mockGetOwnedCards.mockResolvedValue([NEW_CARD, OLD_CARD]);
    mockGetBuybackOffer.mockReturnValue(new Promise(() => undefined));
  });

  it('returns the owned card of the mint, with its sale', async () => {
    const sale = createSale({ mint: 'MintOld' });

    const { result } = renderHookWithQueryClient(
      () => usePackPartnerCard('MintOld'),
      {
        queryClient: createQueryClient(),
        state: createSalesState({ MintOld: sale }),
      },
    );

    await waitFor(() => expect(result.current.card).toBeDefined());
    expect(result.current.card).toStrictEqual({
      ...OLD_CARD,
      sale: { status: 'pending', amount: '42500000', updatedAt: 6_000 },
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('returns one owned card without reading its offer or those of other cards', async () => {
    mockGetBuybackOffer.mockResolvedValue(AVAILABLE);

    const { result } = renderHookWithQueryClient(
      () => usePackPartnerCard('MintNew'),
      { queryClient: createQueryClient() },
    );

    await waitFor(() => expect(result.current.card).toStrictEqual(NEW_CARD));
    expect(getOfferReads()).toStrictEqual([]);
  });

  it('reports loading while no owned-cards read completed', async () => {
    mockGetOwnedCards.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHookWithQueryClient(
      () => usePackPartnerCard('MintOld'),
      { queryClient: createQueryClient() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.card).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('returns no card, without loading or error, for a card the account does not own', async () => {
    const { result } = renderHookWithQueryClient(
      () => ({
        card: usePackPartnerCard('MintUnknown'),
        owned: usePackPartnerCards(),
      }),
      { queryClient: createQueryClient() },
    );

    await waitFor(() => expect(result.current.owned.cards).toHaveLength(2));
    expect(result.current.card).toStrictEqual({
      card: undefined,
      isLoading: false,
      error: undefined,
      refetch: expect.any(Function),
    });
    expect(getOwnedCardsCalls()).toHaveLength(1);
  });

  it('reports the failed read while the card is absent', async () => {
    mockGetOwnedCards.mockRejectedValue(
      createPackPartnerError({ code: 'RATE_LIMITED' }),
    );

    const { result } = renderHookWithQueryClient(
      () => usePackPartnerCard('MintOld'),
      { queryClient: createQueryClient() },
    );

    await waitFor(() =>
      expect(result.current.error).toStrictEqual({ code: 'RATE_LIMITED' }),
    );
    expect(result.current.card).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('reports the offline error after no saved collection is found', async () => {
    goOffline();
    mockGetOwnedCards.mockRejectedValue(
      createPackPartnerError({ code: 'NETWORK_ERROR' }),
    );

    const { result } = renderHookWithQueryClient(
      () => usePackPartnerCard('MintOld'),
      { queryClient: createQueryClient() },
    );

    await waitFor(() =>
      expect(result.current.error).toStrictEqual({ code: 'NETWORK_ERROR' }),
    );
    expect(result.current.card).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps a cached card without error when a later read fails', async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(OWNED_CARDS_KEY, [OLD_CARD]);
    mockGetOwnedCards.mockRejectedValue(
      createPackPartnerError({ code: 'NETWORK_ERROR' }),
    );

    const { result } = renderHookWithQueryClient(
      () => ({
        card: usePackPartnerCard('MintOld'),
        owned: usePackPartnerCards(),
      }),
      { queryClient },
    );

    await waitFor(() => expect(result.current.owned.error).toBeDefined());
    expect(result.current.card.card).toStrictEqual(OLD_CARD);
    expect(result.current.card.error).toBeUndefined();
    expect(result.current.card.isLoading).toBe(false);
  });

  it('refetches by invalidating exactly the owned-cards read of the account', async () => {
    const { result } = renderHookWithQueryClient(
      () => usePackPartnerCard('MintOld'),
      { queryClient: createQueryClient() },
    );
    await waitFor(() => expect(result.current.card).toBeDefined());

    await act(async () => {
      await result.current.refetch();
    });
    await settleQueries();

    expect(getInvalidations()).toStrictEqual([
      { queryKey: OWNED_CARDS_KEY, exact: true },
    ]);
    expect(getOwnedCardsCalls()).toHaveLength(2);
  });

  it('does not read when disabled', () => {
    const { result } = renderHookWithQueryClient(
      () => usePackPartnerCard('MintNew', { enabled: false }),
      { queryClient: createQueryClient() },
    );

    expect(result.current.card).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(mockCall).not.toHaveBeenCalled();
  });
});
