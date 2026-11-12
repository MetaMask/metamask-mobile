import { renderHook } from '@testing-library/react-native';
import { usePackPartnerCards } from '../../../../../UI/Collectibles';
import type {
  CollectiblesCard,
  CollectiblesWalletAccount,
} from '../../../../../UI/Collectibles/types';
import { useCollectiblesCardsForHomepage } from './useCollectiblesCardsForHomepage';

jest.mock('../../../../../UI/Collectibles', () => ({
  usePackPartnerCards: jest.fn(),
}));

type CardsHookResult = ReturnType<typeof usePackPartnerCards>;

const ACCOUNT: CollectiblesWalletAccount = {
  id: 'account-id',
  address: 'SoLAddress1111111111111111111111111111111111',
};

const createCard = (mint: string): CollectiblesCard => ({
  mint,
  name: `Card ${mint}`,
  acquiredAt: 0,
  buyback: { status: 'unknown' },
});

const mockCardsHook = (overrides: Partial<CardsHookResult> = {}): void => {
  jest.mocked(usePackPartnerCards).mockReturnValue({
    account: ACCOUNT,
    cards: [],
    hasLoaded: true,
    isLoading: false,
    error: undefined,
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });
};

describe('useCollectiblesCardsForHomepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the enabled option to the cards hook', () => {
    mockCardsHook();

    renderHook(() =>
      useCollectiblesCardsForHomepage({ maxCards: 6, enabled: false }),
    );

    expect(usePackPartnerCards).toHaveBeenCalledWith({ enabled: false });
  });

  it('returns at most maxCards cards, in order', () => {
    mockCardsHook({
      cards: ['a', 'b', 'c', 'd'].map(createCard),
    });

    const { result } = renderHook(() =>
      useCollectiblesCardsForHomepage({ maxCards: 3, enabled: true }),
    );

    expect(result.current.cards.map((card) => card.mint)).toStrictEqual([
      'a',
      'b',
      'c',
    ]);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('reports loading without error or empty state', () => {
    mockCardsHook({
      isLoading: true,
      error: { code: 'NETWORK_ERROR' },
    });

    const { result } = renderHook(() =>
      useCollectiblesCardsForHomepage({ maxCards: 6, enabled: true }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
  });

  it('reports an error when the read failed and no card was read', () => {
    mockCardsHook({ error: { code: 'NETWORK_ERROR' } });

    const { result } = renderHook(() =>
      useCollectiblesCardsForHomepage({ maxCards: 6, enabled: true }),
    );

    expect(result.current.hasError).toBe(true);
    expect(result.current.isEmpty).toBe(false);
  });

  it('keeps cards already read instead of the error when the read failed', () => {
    mockCardsHook({
      cards: [createCard('a')],
      error: { code: 'NETWORK_ERROR' },
    });

    const { result } = renderHook(() =>
      useCollectiblesCardsForHomepage({ maxCards: 6, enabled: true }),
    );

    expect(result.current.hasError).toBe(false);
    expect(result.current.cards).toHaveLength(1);
  });

  it('reports the empty state when loaded without card', () => {
    mockCardsHook();

    const { result } = renderHook(() =>
      useCollectiblesCardsForHomepage({ maxCards: 6, enabled: true }),
    );

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('returns the account and refetch of the cards hook', () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    mockCardsHook({ refetch });

    const { result } = renderHook(() =>
      useCollectiblesCardsForHomepage({ maxCards: 6, enabled: true }),
    );

    expect(result.current.account).toStrictEqual(ACCOUNT);
    expect(result.current.refetch).toBe(refetch);
  });
});
