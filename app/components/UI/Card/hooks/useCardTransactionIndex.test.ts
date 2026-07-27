import {
  CARD_TX_INDEX_MAX_ITEMS,
  CARD_TX_INDEX_MAX_PAGES,
  classifyCardTransactionsForIndex,
  isMoneyAccountCardTransaction,
  isSettledCardTransaction,
  settlementHashesForCardTransaction,
} from './useCardTransactionIndex';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { MONEY_ACCOUNT_LAUNCH_MS } from '../../../../core/Engine/controllers/card-controller/types';
import {
  MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
} from '../util/vedaToken';

const createTx = (
  overrides: Partial<CardTransaction> = {},
): CardTransaction => ({
  id: 'tx-1',
  providerId: 'baanx',
  timestamp: Date.UTC(2026, 5, 20),
  status: CardTransactionStatus.Completed,
  type: CardTransactionType.Purchase,
  isDebit: true,
  billingAmount: { value: '10.00', currency: 'USD' },
  fundingSources: [],
  ...overrides,
});

describe('useCardTransactionIndex constants', () => {
  it('exposes finite safety valves', () => {
    expect(CARD_TX_INDEX_MAX_PAGES).toBe(5);
    expect(CARD_TX_INDEX_MAX_ITEMS).toBe(300);
  });

  it('uses Money Account launch date as the hard floor', () => {
    expect(MONEY_ACCOUNT_LAUNCH_MS).toBe(Date.UTC(2026, 4, 1));
  });
});

describe('isSettledCardTransaction', () => {
  it('returns true when any funding source has a txHash', () => {
    const tx = createTx({
      fundingSources: [{ txHash: '0xABC' }],
    });

    expect(isSettledCardTransaction(tx)).toBe(true);
  });

  it('returns false when funding sources have no txHash', () => {
    const tx = createTx({
      status: CardTransactionStatus.Failed,
      fundingSources: [{ address: '0xaddr' }],
    });

    expect(isSettledCardTransaction(tx)).toBe(false);
  });

  it('classifies by hash presence, not status', () => {
    const pendingWithHash = createTx({
      status: CardTransactionStatus.Pending,
      fundingSources: [{ txHash: '0x1' }],
    });
    const completedWithoutHash = createTx({
      status: CardTransactionStatus.Completed,
      fundingSources: [],
    });

    expect(isSettledCardTransaction(pendingWithHash)).toBe(true);
    expect(isSettledCardTransaction(completedWithoutHash)).toBe(false);
  });
});

describe('settlementHashesForCardTransaction', () => {
  it('lowercases and filters missing hashes', () => {
    const tx = createTx({
      fundingSources: [
        { txHash: '0xAbCd' },
        { address: '0xnohash' },
        { txHash: '0xEF' },
      ],
    });

    expect(settlementHashesForCardTransaction(tx)).toEqual(['0xabcd', '0xef']);
  });
});

describe('isMoneyAccountCardTransaction', () => {
  it('returns true for veda funding on Monad', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTx({
          fundingSources: [
            {
              currency: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
              chainId: MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
              txHash: '0x1',
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('returns false for base USDC funding', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTx({
          fundingSources: [
            {
              currency: 'usdc',
              chainId: 'eip155:8453',
              txHash: '0x1',
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('returns false for monad USDC funding', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTx({
          fundingSources: [
            {
              currency: 'usdc',
              chainId: MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
              txHash: '0x1',
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('returns true for a VEDA decline with empty funding sources', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTx({
          status: CardTransactionStatus.Failed,
          fundingSources: [],
          declineReason: {
            message:
              'You attempted this MONAD transaction with a balance of 0.500000 VEDA. The total transaction cost was $11.95.',
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns false for a MONAD USDC decline with empty funding sources', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTx({
          status: CardTransactionStatus.Failed,
          fundingSources: [],
          declineReason: {
            message:
              'You attempted this MONAD transaction with a balance of 0.500000 USDC. The total transaction cost was $11.95.',
          },
        }),
      ),
    ).toBe(false);
  });
});

describe('classifyCardTransactionsForIndex', () => {
  it('indexes settled txs by lowercased hash and collects declined rows', () => {
    const settled = createTx({
      id: 'settled',
      fundingSources: [{ txHash: '0xAbC' }],
    });
    const declined = createTx({
      id: 'declined',
      status: CardTransactionStatus.Failed,
      fundingSources: [],
    });

    const result = classifyCardTransactionsForIndex([settled, declined]);

    expect(result.bySettlementHash.get('0xabc')).toBe(settled);
    expect(result.declined).toEqual([declined]);
  });

  it('maps multiple funding hashes of one tx to the same entry', () => {
    const tx = createTx({
      fundingSources: [{ txHash: '0xONE' }, { txHash: '0xTWO' }],
    });

    const result = classifyCardTransactionsForIndex([tx]);

    expect(result.bySettlementHash.get('0xone')).toBe(tx);
    expect(result.bySettlementHash.get('0xtwo')).toBe(tx);
    expect(result.declined).toEqual([]);
  });
});
