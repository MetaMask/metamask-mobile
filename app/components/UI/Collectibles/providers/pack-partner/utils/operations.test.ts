import { PACK_PARTNER_TIMINGS } from '../constants/packPartner';
import type {
  PackPartnerBuybackOperation,
  PackPartnerCard,
  PackPartnerPackOperation,
  PackPartnerPackOperationStatus,
} from '../types/packPartner';
import {
  getAttentionOperations,
  isOperationResumable,
  isOperationTerminal,
  patchOperation,
  prunePurchasesForPersistence,
  pruneSalesForPersistence,
  toCardSale,
  withCardSales,
} from './operations';

const NOW = 1_800_000_000_000;
const { TERMINAL_TTL } = PACK_PARTNER_TIMINGS;

const createOperation = (
  overrides: Partial<PackPartnerPackOperation> = {},
): PackPartnerPackOperation => ({
  memo: 'cc-memo-1',
  packCode: 'pokemon_50',
  packName: 'Elite Pokémon Collectibles Pack',
  price: 50,
  priceAmount: '50000000',
  status: 'submitted',
  createdAt: NOW - 1000,
  updatedAt: NOW - 1000,
  ...overrides,
});

const createCard = (
  overrides: Partial<PackPartnerCard> = {},
): PackPartnerCard => ({
  mint: 'MintA',
  name: 'Giratina EX',
  acquiredAt: NOW - 10_000,
  buyback: { status: 'unknown' },
  ...overrides,
});

const createSale = (
  overrides: Partial<PackPartnerBuybackOperation> = {},
): PackPartnerBuybackOperation => ({
  mint: 'MintA',
  memo: 'buyback-memo',
  status: 'pending',
  amount: '42500000',
  submissionAttempted: false,
  createdAt: NOW - 1000,
  updatedAt: NOW - 1000,
  ...overrides,
});

describe('isOperationResumable / isOperationTerminal', () => {
  it.each<[PackPartnerPackOperationStatus, boolean, boolean]>([
    ['generated', true, false],
    ['submitted', true, false],
    ['paid', true, false],
    ['opened', false, true],
    ['expired', false, true],
    ['failed', false, true],
  ])('classifies %s', (status, resumable, terminal) => {
    const operation = createOperation({ status });

    expect(isOperationResumable(operation)).toBe(resumable);
    expect(isOperationTerminal(operation)).toBe(terminal);
  });
});

describe('getAttentionOperations', () => {
  it('returns an empty list without operations', () => {
    expect(getAttentionOperations(undefined)).toStrictEqual([]);
  });

  it('returns processing, opened, expired and failed operations newest first', () => {
    const operations = {
      a: createOperation({ memo: 'a', status: 'paid', createdAt: 1 }),
      b: createOperation({ memo: 'b', status: 'opened', createdAt: 3 }),
      c: createOperation({ memo: 'c', status: 'expired', createdAt: 2 }),
      d: createOperation({ memo: 'd', status: 'failed', createdAt: 4 }),
    };

    const result = getAttentionOperations(operations);

    expect(result.map((operation) => operation.memo)).toStrictEqual([
      'd',
      'b',
      'c',
      'a',
    ]);
  });

  it('orders operations created at the same time by memo, descending', () => {
    const operations = {
      a: createOperation({ memo: 'a', createdAt: 1 }),
      b: createOperation({ memo: 'b', createdAt: 1 }),
    };

    const result = getAttentionOperations(operations);

    expect(result.map((operation) => operation.memo)).toStrictEqual(['b', 'a']);
  });
});

describe('patchOperation', () => {
  it('records the submitted purchase without its unsigned transaction and clears the error', () => {
    const operation = createOperation({
      status: 'generated',
      transaction: 'unsigned-tx',
      error: { code: 'NETWORK_ERROR' },
    });

    const next = patchOperation(
      operation,
      { status: 'submitted', transaction: undefined },
      NOW,
    );

    expect(next).toStrictEqual({
      memo: 'cc-memo-1',
      packCode: 'pokemon_50',
      packName: 'Elite Pokémon Collectibles Pack',
      price: 50,
      priceAmount: '50000000',
      status: 'submitted',
      createdAt: NOW - 1000,
      updatedAt: NOW,
    });
  });

  it('sets the awarded mint and result when the pack is opened', () => {
    const card = createCard({ memo: 'cc-memo-1' });
    const operation = createOperation({ status: 'paid' });

    const next = patchOperation(
      operation,
      { status: 'opened', mint: card.mint, result: card },
      NOW,
    );

    expect(next).toStrictEqual({
      ...operation,
      status: 'opened',
      mint: 'MintA',
      result: card,
      updatedAt: NOW,
    });
  });

  it('removes the result and mint patched as undefined', () => {
    const operation = createOperation({
      status: 'opened',
      mint: 'MintA',
      result: createCard(),
    });

    const next = patchOperation(
      operation,
      { status: 'failed', mint: undefined, result: undefined },
      NOW,
    );

    expect(next).not.toHaveProperty('mint');
    expect(next).not.toHaveProperty('result');
    expect(next.status).toBe('failed');
  });

  it('keeps the required fields and the optional fields left out of the patch', () => {
    const card = createCard();
    const operation = createOperation({
      status: 'paid',
      batchId: 'batch',
      batchMemos: ['cc-memo-1', 'cc-memo-2'],
      turbo: true,
      result: card,
    });

    const next = patchOperation(
      operation,
      { status: 'opened', mint: 'MintA' },
      NOW,
    );

    expect(next).toStrictEqual({
      ...operation,
      status: 'opened',
      mint: 'MintA',
      updatedAt: NOW,
    });
    expect(next.result).toBe(card);
  });

  it('leaves the original operation unchanged', () => {
    const createGenerated = () =>
      createOperation({
        status: 'generated',
        transaction: 'unsigned-tx',
        error: { code: 'NETWORK_ERROR' },
      });
    const operation = createGenerated();

    patchOperation(
      operation,
      { status: 'submitted', transaction: undefined },
      NOW,
    );

    expect(operation).toStrictEqual(createGenerated());
  });
});

describe('toCardSale', () => {
  it('returns undefined without a buyback operation', () => {
    expect(toCardSale(undefined)).toBeUndefined();
  });

  it('projects a pending sale without workflow bookkeeping', () => {
    const sale = createSale({ submissionAttempted: true });

    const display = toCardSale(sale);

    expect(display).toStrictEqual({
      status: 'pending',
      amount: '42500000',
      updatedAt: NOW - 1000,
    });
  });

  it('includes the signature once known', () => {
    const sale = createSale({
      status: 'completed',
      signature: 'buyback-signature',
      updatedAt: NOW,
    });

    const display = toCardSale(sale);

    expect(display).toStrictEqual({
      status: 'completed',
      amount: '42500000',
      signature: 'buyback-signature',
      updatedAt: NOW,
    });
  });
});

describe('withCardSales', () => {
  it('returns the same list without buyback operations', () => {
    const cards = [createCard()];

    expect(withCardSales(cards, undefined)).toBe(cards);
  });

  it('decorates only the cards with a buyback operation', () => {
    const sold = createCard({ mint: 'MintA' });
    const kept = createCard({ mint: 'MintB' });
    const sales = {
      MintA: createSale({ mint: 'MintA', status: 'completed', updatedAt: NOW }),
    };

    const result = withCardSales([sold, kept], sales);

    expect(result[0]).toStrictEqual({
      ...sold,
      sale: { status: 'completed', amount: '42500000', updatedAt: NOW },
    });
    expect(result[1]).toBe(kept);
    expect(sold).not.toHaveProperty('sale');
  });

  it('keeps an automatic Turbo sale on a card without a buyback operation', () => {
    const turbo = createCard({
      mint: 'MintTurbo',
      sale: {
        status: 'completed',
        automatic: true,
        amount: '10000000',
        updatedAt: NOW,
      },
    });

    const result = withCardSales([turbo], { MintA: createSale() });

    expect(result[0]).toBe(turbo);
  });

  it('ignores buyback operations of cards absent from the list', () => {
    const card = createCard({ mint: 'MintB' });

    const result = withCardSales([card], { MintA: createSale() });

    expect(result).toStrictEqual([card]);
  });
});

describe('prunePurchasesForPersistence', () => {
  it.each(['submitted', 'paid', 'opened', 'failed', 'expired'] as const)(
    'keeps the %s purchase recovery references without any transaction',
    (status) => {
      const operation = createOperation({
        status,
        transaction: 'unsigned-tx',
        batchId: 'batch',
        batchMemos: ['cc-memo-1', 'cc-memo-2'],
      });

      const result = prunePurchasesForPersistence(
        { address: { [operation.memo]: operation } },
        NOW,
      );

      expect(result.address[operation.memo]).toStrictEqual({
        memo: operation.memo,
        packCode: operation.packCode,
        packName: operation.packName,
        price: operation.price,
        priceAmount: operation.priceAmount,
        createdAt: operation.createdAt,
        updatedAt: operation.updatedAt,
        status,
        batchId: 'batch',
        batchMemos: ['cc-memo-1', 'cc-memo-2'],
      });
      expect(JSON.stringify(result)).not.toContain('unsigned-tx');
      expect(operation.transaction).toBe('unsigned-tx');
    },
  );

  it('drops generated operations', () => {
    const operations = {
      addr1: {
        gen: createOperation({
          memo: 'gen',
          status: 'generated',
          transaction: 'unsigned-tx',
        }),
        submitted: createOperation({ memo: 'submitted' }),
      },
    };

    const pruned = prunePurchasesForPersistence(operations, NOW);

    expect(pruned).toStrictEqual({
      addr1: { submitted: createOperation({ memo: 'submitted' }) },
    });
  });

  it('keeps the awarded card of an opened purchase', () => {
    const card = createCard();
    const opened = createOperation({
      memo: 'opened',
      status: 'opened',
      mint: card.mint,
      result: card,
    });

    const pruned = prunePurchasesForPersistence({ addr1: { opened } }, NOW);

    expect(pruned.addr1.opened.result).toStrictEqual(card);
  });

  it('drops terminal operations older than TERMINAL_TTL only', () => {
    const recent = createOperation({
      memo: 'recent',
      status: 'opened',
      updatedAt: NOW - TERMINAL_TTL,
    });
    const old = createOperation({
      memo: 'old',
      status: 'expired',
      updatedAt: NOW - TERMINAL_TTL - 1,
    });
    const oldFailed = createOperation({
      memo: 'oldFailed',
      status: 'failed',
      updatedAt: NOW - TERMINAL_TTL - 1,
    });
    const oldPaid = createOperation({
      memo: 'paid',
      status: 'paid',
      updatedAt: NOW - TERMINAL_TTL - 1,
    });
    const oldSubmitted = createOperation({
      memo: 'submitted',
      status: 'submitted',
      updatedAt: NOW - TERMINAL_TTL - 1,
    });

    const pruned = prunePurchasesForPersistence(
      {
        addr1: {
          recent,
          old,
          oldFailed,
          paid: oldPaid,
          submitted: oldSubmitted,
        },
      },
      NOW,
    );

    expect(pruned).toStrictEqual({
      addr1: { recent, paid: oldPaid, submitted: oldSubmitted },
    });
  });

  it('drops accounts left without operations', () => {
    const operations = {
      addr1: { gen: createOperation({ memo: 'gen', status: 'generated' }) },
      addr2: { submitted: createOperation({ memo: 'submitted' }) },
      addr3: {},
    };

    const pruned = prunePurchasesForPersistence(operations, NOW);

    expect(Object.keys(pruned)).toStrictEqual(['addr2']);
  });
});

describe('pruneSalesForPersistence', () => {
  it('always keeps a pending sale', () => {
    const pending = createSale({ updatedAt: NOW - TERMINAL_TTL * 10 });

    const pruned = pruneSalesForPersistence({ addr1: { MintA: pending } }, NOW);

    expect(pruned).toStrictEqual({ addr1: { MintA: pending } });
  });

  it('keeps a completed sale as a receipt until TERMINAL_TTL', () => {
    const recent = createSale({
      mint: 'MintA',
      status: 'completed',
      signature: 'sig-a',
      updatedAt: NOW - TERMINAL_TTL,
    });
    const old = createSale({
      mint: 'MintB',
      status: 'completed',
      signature: 'sig-b',
      updatedAt: NOW - TERMINAL_TTL - 1,
    });

    const pruned = pruneSalesForPersistence(
      { addr1: { MintA: recent, MintB: old } },
      NOW,
    );

    expect(pruned).toStrictEqual({ addr1: { MintA: recent } });
  });

  it('drops accounts left without sales', () => {
    const old = createSale({
      status: 'completed',
      updatedAt: NOW - TERMINAL_TTL - 1,
    });

    const pruned = pruneSalesForPersistence(
      { addr1: { MintA: old }, addr2: { MintA: createSale() }, addr3: {} },
      NOW,
    );

    expect(Object.keys(pruned)).toStrictEqual(['addr2']);
  });
});
