import type { RootState } from '../../../../../../reducers';
import type { PackPartnerState } from '../state';
import type {
  PackPartnerBuybackOperation,
  PackPartnerPackOperation,
} from '../types/packPartner';
import {
  selectPackPartnerAttentionOperations,
  selectPackPartnerOperation,
  selectPackPartnerSales,
  selectPackPartnerState,
} from './packPartner';

const ADDRESS_A = 'AddressA1111111111111111111111111111111111111';
const ADDRESS_B = 'AddressB1111111111111111111111111111111111111';

const createOperation = (
  overrides: Partial<PackPartnerPackOperation> = {},
): PackPartnerPackOperation => ({
  memo: 'memo-1',
  packCode: 'pokemon_50',
  packName: 'Pack',
  price: 50,
  priceAmount: '50000000',
  status: 'paid',
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const createSale = (
  overrides: Partial<PackPartnerBuybackOperation> = {},
): PackPartnerBuybackOperation => ({
  mint: 'MintA',
  memo: 'sale-memo',
  status: 'pending',
  amount: '1000000',
  submissionAttempted: true,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const createState = (providerState: PackPartnerState | undefined): RootState =>
  ({
    engine: {
      backgroundState: {
        CollectiblesController: providerState
          ? { packPartner: providerState }
          : undefined,
      },
    },
  }) as unknown as RootState;

const providerState: PackPartnerState = {
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
  sales: {
    [ADDRESS_A]: {
      MintA: createSale(),
      MintSold: createSale({
        mint: 'MintSold',
        status: 'completed',
        signature: 'sig',
      }),
    },
  },
};

describe('selectPackPartnerState', () => {
  it('returns the provider state', () => {
    const state = createState(providerState);

    expect(selectPackPartnerState(state)).toBe(providerState);
  });

  it('returns the default state before init', () => {
    const state = createState(undefined);

    expect(selectPackPartnerState(state)).toStrictEqual({
      operations: {},
      sales: {},
    });
  });
});

describe('selectPackPartnerSales', () => {
  it('returns the buyback operations of the address, by mint', () => {
    const state = createState(providerState);

    const sales = selectPackPartnerSales(state, ADDRESS_A);

    expect(sales).toBe(providerState.sales[ADDRESS_A]);
  });

  it('returns undefined for an address without sales', () => {
    const state = createState(providerState);

    expect(selectPackPartnerSales(state, ADDRESS_B)).toBeUndefined();
  });

  it('returns undefined without address', () => {
    const state = createState(providerState);

    expect(selectPackPartnerSales(state, undefined)).toBeUndefined();
  });

  it('returns undefined before init', () => {
    const state = createState(undefined);

    expect(selectPackPartnerSales(state, ADDRESS_A)).toBeUndefined();
  });
});

describe('selectPackPartnerOperation', () => {
  it('returns the operation of the address', () => {
    const state = createState(providerState);

    expect(selectPackPartnerOperation(state, ADDRESS_A, 'memo-2')?.status).toBe(
      'opened',
    );
  });

  it('returns undefined for another address', () => {
    const state = createState(providerState);

    expect(
      selectPackPartnerOperation(state, ADDRESS_B, 'memo-1'),
    ).toBeUndefined();
  });

  it('returns undefined without address', () => {
    const state = createState(providerState);

    expect(
      selectPackPartnerOperation(state, undefined, 'memo-1'),
    ).toBeUndefined();
  });
});

describe('selectPackPartnerAttentionOperations', () => {
  it('returns the attention operations of the address, newest first', () => {
    const state = createState(providerState);

    const operations = selectPackPartnerAttentionOperations(state, ADDRESS_A);

    expect(operations.map((operation) => operation.memo)).toStrictEqual([
      'memo-2',
      'memo-1',
    ]);
  });

  it('returns an empty list for an address without operations', () => {
    const state = createState(providerState);

    expect(
      selectPackPartnerAttentionOperations(state, ADDRESS_B),
    ).toStrictEqual([]);
  });

  it('returns an empty list without address', () => {
    const state = createState(providerState);

    expect(
      selectPackPartnerAttentionOperations(state, undefined),
    ).toStrictEqual([]);
  });

  it('returns the same reference while the address operations are unchanged', () => {
    const state = createState(providerState);
    const first = selectPackPartnerAttentionOperations(state, ADDRESS_A);
    selectPackPartnerAttentionOperations(state, ADDRESS_B);
    const nextState = createState({
      ...providerState,
      operations: {
        ...providerState.operations,
        [ADDRESS_B]: { 'memo-3': createOperation({ memo: 'memo-3' }) },
      },
      sales: {},
    });

    const second = selectPackPartnerAttentionOperations(nextState, ADDRESS_A);

    expect(second).toBe(first);
  });
});
