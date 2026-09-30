import { COLLECTOR_CRYPT_TIMINGS } from '../constants';
import type { PackOperation, PackOperationStatus } from '../types';
import {
  getAttentionOperations,
  isOperationResumable,
  isOperationTerminal,
  patchOperation,
  pruneOperationsForPersistence,
} from './operations';

const NOW = 1_800_000_000_000;

const createOperation = (
  overrides: Partial<PackOperation> = {},
): PackOperation => ({
  memo: 'cc-memo-1',
  packCode: 'pokemon_50',
  packName: 'Elite Pokémon Gacha Pack',
  price: 50,
  status: 'signed',
  createdAt: NOW - 1000,
  updatedAt: NOW - 1000,
  ...overrides,
});

describe('isOperationResumable / isOperationTerminal', () => {
  it.each<[PackOperationStatus, boolean, boolean]>([
    ['generated', true, false],
    ['signed', true, false],
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
});

describe('patchOperation', () => {
  it('applies the patch, removes undefined fields and clears the error', () => {
    const operation = createOperation({
      status: 'generated',
      transaction: 'tx',
      error: { code: 'NETWORK_ERROR' },
    });

    const next = patchOperation(
      operation,
      { status: 'signed', signedTransaction: 'signed', transaction: undefined },
      NOW,
    );

    expect(next).toStrictEqual({
      memo: 'cc-memo-1',
      packCode: 'pokemon_50',
      packName: 'Elite Pokémon Gacha Pack',
      price: 50,
      status: 'signed',
      createdAt: NOW - 1000,
      updatedAt: NOW,
      signedTransaction: 'signed',
    });
  });

  it('sets the error provided by the patch', () => {
    const next = patchOperation(
      createOperation(),
      { error: { code: 'SUBMIT_FAILED' } },
      NOW,
    );

    expect(next.error).toStrictEqual({ code: 'SUBMIT_FAILED' });
  });
});

describe('pruneOperationsForPersistence', () => {
  const { TERMINAL_TTL } = COLLECTOR_CRYPT_TIMINGS;

  it('drops generated operations and the unsigned transaction', () => {
    const operations = {
      addr1: {
        gen: createOperation({
          memo: 'gen',
          status: 'generated',
          transaction: 'tx',
        }),
        signed: createOperation({
          memo: 'signed',
          transaction: 'tx',
          signedTransaction: 'stx',
        }),
      },
    };

    const pruned = pruneOperationsForPersistence(operations, NOW);

    expect(pruned).toStrictEqual({
      addr1: {
        signed: createOperation({ memo: 'signed', signedTransaction: 'stx' }),
      },
    });
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
    const oldResumable = createOperation({
      memo: 'paid',
      status: 'paid',
      updatedAt: NOW - TERMINAL_TTL - 1,
    });

    const pruned = pruneOperationsForPersistence(
      { addr1: { recent, old, paid: oldResumable } },
      NOW,
    );

    expect(pruned).toStrictEqual({ addr1: { recent, paid: oldResumable } });
  });

  it('drops accounts left without operations', () => {
    const operations = {
      addr1: { gen: createOperation({ memo: 'gen', status: 'generated' }) },
      addr2: { signed: createOperation({ memo: 'signed' }) },
    };

    const pruned = pruneOperationsForPersistence(operations, NOW);

    expect(Object.keys(pruned)).toStrictEqual(['addr2']);
  });
});
