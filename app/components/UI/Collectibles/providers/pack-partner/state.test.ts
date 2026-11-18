import { PACK_PARTNER_TIMINGS } from './constants/packPartner';
import {
  getDefaultPackPartnerState,
  getPersistedPackPartnerState,
  restorePackPartnerState,
  type PackPartnerState,
} from './state';
import type {
  PackPartnerBuybackOperation,
  PackPartnerCard,
  PackPartnerPackOperation,
} from './types/packPartner';

const NOW = 1_800_000_000_000;
const ADDRESS = 'AddressA1111111111111111111111111111111111111';
const { TERMINAL_TTL } = PACK_PARTNER_TIMINGS;

const createCard = (
  overrides: Partial<PackPartnerCard> = {},
): PackPartnerCard => ({
  mint: 'MintA',
  name: 'Pikachu',
  acquiredAt: NOW,
  memo: 'opening-memo',
  batchId: 'batch',
  buyback: { status: 'unknown' },
  ...overrides,
});

const createOperation = (
  overrides: Partial<PackPartnerPackOperation> = {},
): PackPartnerPackOperation => ({
  memo: 'opening-memo',
  packCode: 'pokemon_50',
  packName: 'Core pack',
  price: 50,
  priceAmount: '50000000',
  status: 'submitted',
  createdAt: NOW - 1000,
  updatedAt: NOW - 1000,
  ...overrides,
});

const createSale = (
  overrides: Partial<PackPartnerBuybackOperation> = {},
): PackPartnerBuybackOperation => ({
  mint: 'MintA',
  memo: 'sale-memo',
  status: 'pending',
  amount: '25000000',
  submissionAttempted: true,
  signature: 'sale-signature',
  createdAt: NOW - 1000,
  updatedAt: NOW - 1000,
  ...overrides,
});

describe('getDefaultPackPartnerState', () => {
  it('returns an empty operation journal', () => {
    expect(getDefaultPackPartnerState()).toStrictEqual({
      operations: {},
      sales: {},
    });
  });

  it('returns a new state on every call', () => {
    expect(getDefaultPackPartnerState()).not.toBe(getDefaultPackPartnerState());
  });
});

describe('restorePackPartnerState', () => {
  it('removes legacy error messages from purchases and sales', () => {
    const error = {
      code: 'OPEN_PENDING' as const,
      message: 'private-transaction',
      cause: { token: 'secret-key' },
    };
    const operation = createOperation({ error });
    const sale = { ...createSale(), error };

    const restored = restorePackPartnerState({
      operations: { [ADDRESS]: { [operation.memo]: operation } },
      sales: { [ADDRESS]: { [sale.mint]: sale } },
    });

    expect(restored.operations[ADDRESS][operation.memo].error).toEqual({
      code: 'OPEN_PENDING',
    });
    expect(restored.sales[ADDRESS][sale.mint]).not.toHaveProperty('error');
    expect(JSON.stringify(restored)).not.toContain('private-transaction');
    expect(JSON.stringify(restored)).not.toContain('secret-key');
  });

  it('replaces unknown persisted error codes', () => {
    const operation = {
      ...createOperation(),
      error: { code: 'private-transaction' },
    };

    const restored = restorePackPartnerState({
      operations: { [ADDRESS]: { [operation.memo]: operation } },
    });

    expect(restored.operations[ADDRESS][operation.memo].error).toEqual({
      code: 'UNKNOWN',
    });
  });
  it('returns the default state without persisted state', () => {
    const state = restorePackPartnerState(undefined);

    expect(state).toStrictEqual({ operations: {}, sales: {} });
  });

  it('restores missing journals as empty', () => {
    const state = restorePackPartnerState({});

    expect(state).toStrictEqual({ operations: {}, sales: {} });
  });

  it('drops the cards cache of earlier builds', () => {
    const persisted = {
      operations: {},
      cards: { [ADDRESS]: { MintA: createCard() } },
    };

    const state = restorePackPartnerState(persisted);

    expect(state).toStrictEqual({ operations: {}, sales: {} });
    expect(state).not.toHaveProperty('cards');
  });

  it('resumes a legacy signed purchase as submitted, without its signed bytes', () => {
    const legacy = {
      ...createOperation({ status: 'paid' }),
      priceAmount: undefined,
      status: 'signed',
      signedTransaction: 'signed-purchase-bytes',
      signature: 'purchase-signature',
      transaction: 'unsigned-tx',
    };

    const state = restorePackPartnerState({
      operations: { [ADDRESS]: { [legacy.memo]: legacy } },
    });

    expect(state.operations[ADDRESS][legacy.memo]).toStrictEqual(
      createOperation({ status: 'submitted' }),
    );
    expect(JSON.stringify(state)).not.toContain('signed-purchase-bytes');
  });

  it.each(['generated', 'submitted', 'paid', 'opened', 'expired', 'failed'])(
    'keeps a %s purchase status and strips every transaction field',
    (status) => {
      const legacy = {
        ...createOperation(),
        status,
        signedTransaction: 'signed-purchase-bytes',
        signature: 'purchase-signature',
        transaction: 'unsigned-tx',
      };

      const state = restorePackPartnerState({
        operations: { [ADDRESS]: { [legacy.memo]: legacy } },
      });

      const restored = state.operations[ADDRESS][legacy.memo];
      expect(restored.status).toBe(status);
      expect(restored).not.toHaveProperty('signedTransaction');
      expect(restored).not.toHaveProperty('signature');
      expect(restored).not.toHaveProperty('transaction');
    },
  );

  it.each([
    [50, '50000000'],
    [12.5, '12500000'],
  ])(
    'derives the signed amount of a legacy purchase priced %s USDC as %s base units',
    (price, priceAmount) => {
      const { priceAmount: _priceAmount, ...legacy } = createOperation({
        price,
      });

      const state = restorePackPartnerState({
        operations: { [ADDRESS]: { [legacy.memo]: legacy } },
      });

      expect(state.operations[ADDRESS][legacy.memo]).toStrictEqual(
        createOperation({ price, priceAmount }),
      );
    },
  );

  it('keeps the stored signed amount of a purchase', () => {
    const operation = createOperation({ price: 50, priceAmount: '49990000' });

    const state = restorePackPartnerState({
      operations: { [ADDRESS]: { [operation.memo]: operation } },
    });

    expect(state.operations[ADDRESS][operation.memo].priceAmount).toBe(
      '49990000',
    );
  });

  it('keeps the recovery references and the awarded card of a purchase', () => {
    const card = createCard();
    const operation = createOperation({
      status: 'opened',
      batchId: 'batch',
      batchMemos: ['opening-memo', 'opening-memo-2'],
      mint: card.mint,
      result: card,
      revealed: true,
    });

    const state = restorePackPartnerState({
      operations: { [ADDRESS]: { [operation.memo]: operation } },
    });

    expect(state.operations[ADDRESS][operation.memo]).toStrictEqual(operation);
  });

  it('drops a manual sale and legacy bookkeeping stored on an opening result', () => {
    const legacyResult = {
      ...createCard({ buyback: { status: 'available', amount: '25000000' } }),
      source: 'openPack',
      buyback: {
        status: 'available',
        amount: '25000000',
        checkedAt: NOW - 1000,
      },
      sale: {
        status: 'pending',
        amount: '25000000',
        memo: 'sale-memo',
        submissionAttempted: true,
        updatedAt: NOW - 1000,
      },
    } as PackPartnerCard;
    const operation = createOperation({
      status: 'opened',
      mint: legacyResult.mint,
      result: legacyResult,
    });

    const state = restorePackPartnerState({
      operations: { [ADDRESS]: { [operation.memo]: operation } },
    });

    expect(state.operations[ADDRESS][operation.memo].result).toStrictEqual(
      createCard({ buyback: { status: 'available', amount: '25000000' } }),
    );
  });

  it('keeps the automatic Turbo sale of an opening result', () => {
    const result = createCard({
      buyback: { status: 'unavailable' },
      sale: {
        status: 'completed',
        automatic: true,
        amount: '1000000',
        signature: 'turbo-signature',
        updatedAt: NOW - 1000,
      },
    });
    const operation = createOperation({
      status: 'opened',
      mint: result.mint,
      result,
    });

    const state = restorePackPartnerState({
      operations: { [ADDRESS]: { [operation.memo]: operation } },
    });

    expect(state.operations[ADDRESS][operation.memo].result).toStrictEqual(
      result,
    );
  });

  it('keeps the buyback journal', () => {
    const sales = {
      [ADDRESS]: {
        MintA: createSale(),
        MintB: createSale({ mint: 'MintB', status: 'completed' }),
      },
    };

    const state = restorePackPartnerState({ operations: {}, sales });

    expect(state.sales).toStrictEqual(sales);
  });
});

describe('getPersistedPackPartnerState', () => {
  it('strips raw legacy errors from the persistence projection without mutating memory', () => {
    const error = {
      code: 'OPEN_PENDING' as const,
      message: 'private-transaction',
    };
    const operation = createOperation({ error });
    const sale = { ...createSale(), error };
    const state: PackPartnerState = {
      operations: { [ADDRESS]: { [operation.memo]: operation } },
      sales: { [ADDRESS]: { [sale.mint]: sale } },
    };

    const persisted = getPersistedPackPartnerState(state, NOW);

    expect(persisted.operations[ADDRESS][operation.memo].error).toEqual({
      code: 'OPEN_PENDING',
    });
    expect(persisted.sales[ADDRESS][sale.mint]).not.toHaveProperty('error');
    expect(JSON.stringify(persisted)).not.toContain('private-transaction');
    expect(state.operations[ADDRESS][operation.memo].error).toBe(error);
  });
  it('persists only the purchases and sales needed after a restart', () => {
    const generated = createOperation({
      memo: 'generated',
      status: 'generated',
      transaction: 'unsigned-tx',
    });
    const submitted = createOperation({ memo: 'submitted' });
    const oldOpened = createOperation({
      memo: 'old-opened',
      status: 'opened',
      updatedAt: NOW - TERMINAL_TTL - 1,
    });
    const pending = createSale({
      mint: 'MintPending',
      updatedAt: NOW - TERMINAL_TTL - 1,
    });
    const recentSold = createSale({
      mint: 'MintRecent',
      status: 'completed',
      updatedAt: NOW - TERMINAL_TTL,
    });
    const oldSold = createSale({
      mint: 'MintOld',
      status: 'completed',
      updatedAt: NOW - TERMINAL_TTL - 1,
    });
    const state: PackPartnerState = {
      operations: {
        [ADDRESS]: { generated, submitted, 'old-opened': oldOpened },
        AddressOnlyGenerated: { generated },
      },
      sales: {
        [ADDRESS]: {
          MintPending: pending,
          MintRecent: recentSold,
          MintOld: oldSold,
        },
        AddressOnlyOldSale: { MintOld: oldSold },
      },
    };

    const persisted = getPersistedPackPartnerState(state, NOW);

    expect(persisted).toStrictEqual({
      operations: { [ADDRESS]: { submitted } },
      sales: {
        [ADDRESS]: { MintPending: pending, MintRecent: recentSold },
      },
    });
    expect(JSON.stringify(persisted)).not.toContain('unsigned-tx');
  });

  it('leaves the state in memory unchanged', () => {
    const generated = createOperation({
      status: 'generated',
      transaction: 'unsigned-tx',
    });
    const state: PackPartnerState = {
      operations: { [ADDRESS]: { [generated.memo]: generated } },
      sales: {},
    };

    getPersistedPackPartnerState(state, NOW);

    expect(state.operations[ADDRESS][generated.memo]).toBe(generated);
    expect(generated.transaction).toBe('unsigned-tx');
  });
});
