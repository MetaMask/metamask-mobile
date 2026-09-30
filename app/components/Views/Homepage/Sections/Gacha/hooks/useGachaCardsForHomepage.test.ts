import { renderHook } from '@testing-library/react-native';
import { useCollectorCryptCards } from '../../../../../UI/Gacha';
import type {
  CollectorCryptCard,
  SolanaAccountRef,
} from '../../../../../UI/Gacha/providers/collector-crypt/types';
import { useGachaCardsForHomepage } from './useGachaCardsForHomepage';

jest.mock('../../../../../UI/Gacha', () => ({
  useCollectorCryptCards: jest.fn(),
}));

type CardsHookResult = ReturnType<typeof useCollectorCryptCards>;

const ACCOUNT: SolanaAccountRef = {
  id: 'account-id',
  address: 'SoLAddress1111111111111111111111111111111111',
};

const createCard = (mint: string): CollectorCryptCard => ({
  mint,
  name: `Card ${mint}`,
  source: 'nftApi',
  acquiredAt: 0,
  buyback: { status: 'unknown' },
});

const mockCardsHook = (overrides: Partial<CardsHookResult> = {}): void => {
  jest.mocked(useCollectorCryptCards).mockReturnValue({
    account: ACCOUNT,
    cards: [],
    isLoading: false,
    isSyncing: false,
    error: undefined,
    refetch: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });
};

describe('useGachaCardsForHomepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the enabled option to the cards hook', () => {
    mockCardsHook();

    renderHook(() => useGachaCardsForHomepage({ maxCards: 6, enabled: false }));

    expect(useCollectorCryptCards).toHaveBeenCalledWith({ enabled: false });
  });

  it('returns at most maxCards cards, in order', () => {
    mockCardsHook({
      cards: ['a', 'b', 'c', 'd'].map(createCard),
    });

    const { result } = renderHook(() =>
      useGachaCardsForHomepage({ maxCards: 3, enabled: true }),
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
      useGachaCardsForHomepage({ maxCards: 6, enabled: true }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasError).toBe(false);
    expect(result.current.isEmpty).toBe(false);
  });

  it('reports an error when the sync failed and there is no cached card', () => {
    mockCardsHook({ error: { code: 'NETWORK_ERROR' } });

    const { result } = renderHook(() =>
      useGachaCardsForHomepage({ maxCards: 6, enabled: true }),
    );

    expect(result.current.hasError).toBe(true);
    expect(result.current.isEmpty).toBe(false);
  });

  it('keeps cached cards instead of the error when the sync failed', () => {
    mockCardsHook({
      cards: [createCard('a')],
      error: { code: 'NETWORK_ERROR' },
    });

    const { result } = renderHook(() =>
      useGachaCardsForHomepage({ maxCards: 6, enabled: true }),
    );

    expect(result.current.hasError).toBe(false);
    expect(result.current.cards).toHaveLength(1);
  });

  it('reports the empty state when loaded without card', () => {
    mockCardsHook();

    const { result } = renderHook(() =>
      useGachaCardsForHomepage({ maxCards: 6, enabled: true }),
    );

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('returns the account and refetch of the cards hook', () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    mockCardsHook({ refetch });

    const { result } = renderHook(() =>
      useGachaCardsForHomepage({ maxCards: 6, enabled: true }),
    );

    expect(result.current.account).toStrictEqual(ACCOUNT);
    expect(result.current.refetch).toBe(refetch);
  });
});
