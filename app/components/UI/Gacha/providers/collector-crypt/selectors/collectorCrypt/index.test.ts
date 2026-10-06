import type { RootState } from '../../../../../../../reducers';
import type { CollectorCryptState } from '../../state';
import type { CollectorCryptCard, PackOperation } from '../../types';
import {
  selectCollectorCryptAttentionOperations,
  selectCollectorCryptCard,
  selectCollectorCryptCards,
  selectCollectorCryptState,
  selectCollectorCryptOperation,
} from '.';

const ADDRESS_A = 'AddressA1111111111111111111111111111111111111';
const ADDRESS_B = 'AddressB1111111111111111111111111111111111111';

const createCard = (
  overrides: Partial<CollectorCryptCard> = {},
): CollectorCryptCard => ({
  mint: 'MintA',
  name: 'Card',
  source: 'nftApi',
  acquiredAt: 1,
  buyback: { status: 'unknown' },
  ...overrides,
});

const createOperation = (
  overrides: Partial<PackOperation> = {},
): PackOperation => ({
  memo: 'memo-1',
  packCode: 'pokemon_50',
  packName: 'Pack',
  price: 50,
  status: 'paid',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const createState = (
  providerState: CollectorCryptState | undefined,
): RootState =>
  ({
    engine: {
      backgroundState: {
        GachaController: providerState
          ? { collectorCrypt: providerState }
          : undefined,
      },
    },
  }) as unknown as RootState;

const providerState: CollectorCryptState = {
  operations: {
    [ADDRESS_A]: {
      'memo-1': createOperation(),
      'memo-2': createOperation({
        memo: 'memo-2',
        status: 'opened',
        createdAt: 2,
      }),
    },
  },
  cards: {
    [ADDRESS_A]: {
      MintA: createCard({ acquiredAt: 1 }),
      MintB: createCard({ mint: 'MintB', acquiredAt: 2 }),
      MintSold: createCard({
        mint: 'MintSold',
        acquiredAt: 3,
        sale: { status: 'completed', amount: '1', updatedAt: 3 },
      }),
    },
    [ADDRESS_B]: { MintC: createCard({ mint: 'MintC' }) },
  },
};

describe('selectCollectorCryptState', () => {
  it('returns the provider state', () => {
    const state = createState(providerState);

    expect(selectCollectorCryptState(state)).toBe(providerState);
  });

  it('returns the default state before init', () => {
    const state = createState(undefined);

    expect(selectCollectorCryptState(state)).toStrictEqual({
      operations: {},
      cards: {},
    });
  });
});

describe('selectCollectorCryptCards', () => {
  it('returns the visible cards of the address, newest first', () => {
    const state = createState(providerState);

    const cards = selectCollectorCryptCards(state, ADDRESS_A);

    expect(cards.map((card) => card.mint)).toStrictEqual(['MintB', 'MintA']);
  });

  it('never returns cards of another address', () => {
    const state = createState(providerState);

    const cards = selectCollectorCryptCards(state, ADDRESS_B);

    expect(cards.map((card) => card.mint)).toStrictEqual(['MintC']);
  });

  it('returns an empty list without address', () => {
    const state = createState(providerState);

    expect(selectCollectorCryptCards(state, undefined)).toStrictEqual([]);
  });

  it('returns the same reference while the address cards are unchanged', () => {
    const state = createState(providerState);
    const first = selectCollectorCryptCards(state, ADDRESS_A);
    selectCollectorCryptCards(state, ADDRESS_B);
    const nextState = createState({
      ...providerState,
      cards: { ...providerState.cards, [ADDRESS_B]: {} },
    });

    const second = selectCollectorCryptCards(nextState, ADDRESS_A);

    expect(second).toBe(first);
  });
});

describe('selectCollectorCryptCard', () => {
  it('returns the card of the address', () => {
    const state = createState(providerState);

    expect(selectCollectorCryptCard(state, ADDRESS_A, 'MintB')?.mint).toBe(
      'MintB',
    );
  });

  it('returns undefined for a card of another address', () => {
    const state = createState(providerState);

    expect(selectCollectorCryptCard(state, ADDRESS_B, 'MintA')).toBeUndefined();
  });

  it('returns undefined without address', () => {
    const state = createState(providerState);

    expect(selectCollectorCryptCard(state, undefined, 'MintA')).toBeUndefined();
  });
});

describe('selectCollectorCryptOperation', () => {
  it('returns the operation of the address', () => {
    const state = createState(providerState);

    expect(
      selectCollectorCryptOperation(state, ADDRESS_A, 'memo-2')?.status,
    ).toBe('opened');
  });

  it('returns undefined for another address', () => {
    const state = createState(providerState);

    expect(
      selectCollectorCryptOperation(state, ADDRESS_B, 'memo-1'),
    ).toBeUndefined();
  });
});

describe('selectCollectorCryptAttentionOperations', () => {
  it('returns the attention operations of the address, newest first', () => {
    const state = createState(providerState);

    const operations = selectCollectorCryptAttentionOperations(
      state,
      ADDRESS_A,
    );

    expect(operations.map((operation) => operation.memo)).toStrictEqual([
      'memo-2',
      'memo-1',
    ]);
  });

  it('returns an empty list for an address without operations', () => {
    const state = createState(providerState);

    expect(
      selectCollectorCryptAttentionOperations(state, ADDRESS_B),
    ).toStrictEqual([]);
  });
});
