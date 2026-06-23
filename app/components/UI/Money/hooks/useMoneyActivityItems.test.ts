import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import {
  mergeMoneyActivity,
  buildMoneyActivityBuckets,
} from './useMoneyActivityItems';
import { MoneyActivityFilter } from '../constants/mockActivityData';
import type { AccountsApiActivity } from '../types/moneyActivity';

const onchainTx = (id: string, time: number, hash?: Hex): TransactionMeta =>
  ({ id, time, hash }) as TransactionMeta;

const cardTx = (hash: Hex, time: number): AccountsApiActivity => ({
  kind: 'card',
  hash,
  time,
  chainId: '0x8f',
  token: { address: '0xusdc' as Hex, symbol: 'USDC', decimals: 6 },
  amount: '1000000',
  paidTo: '0xsettlement' as Hex,
});

const cashbackTx = (hash: Hex, time: number): AccountsApiActivity => ({
  kind: 'cashback',
  hash,
  time,
  chainId: '0x8f',
  token: { address: '0xmusd' as Hex, symbol: 'mUSD', decimals: 6 },
  amount: '300000',
  receivedFrom: '0xrewarder' as Hex,
});

const rampOrder = (
  providerOrderId: string,
  time: number,
  txHash?: Hex,
): RampsOrder =>
  ({
    providerOrderId,
    createdAt: time,
    txHash,
    walletAddress: '0x0000000000000000000000000000000000000001',
    status: RampsOrderStatus.Completed,
    cryptoAmount: '4.96',
    fiatAmount: 6.14,
    fiatCurrency: { symbol: 'USD' },
    cryptoCurrency: { symbol: 'MUSD' },
    orderType: 'BUY',
  }) as RampsOrder;

describe('mergeMoneyActivity', () => {
  it('merges both sources, tags by source, and sorts time-descending', () => {
    const onchain = [onchainTx('a', 100), onchainTx('b', 300)];
    const api = [cardTx('0xcard' as Hex, 200)];
    const ramps = [rampOrder('ramp-order', 400)];

    const items = mergeMoneyActivity(onchain, api, ramps);

    expect(items.map((i) => [i.kind, i.id, i.time])).toEqual([
      ['rampOrder', 'ramp-order', 400],
      ['onchain', 'b', 300],
      ['accountsApi', '0xcard', 200],
      ['onchain', 'a', 100],
    ]);
  });

  it('drops an on-chain row that collides with an API hash (double-count guard)', () => {
    const shared = '0xAbC123' as Hex;
    const onchain = [onchainTx('dup', 100, shared)];
    const api = [cardTx('0xabc123' as Hex, 100)];

    const items = mergeMoneyActivity(onchain, api);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'accountsApi', id: '0xabc123' });
  });

  it('drops a ramp order whose tx hash already exists on-chain', () => {
    const shared = '0xAbC123' as Hex;
    const onchain = [onchainTx('dup', 100, shared)];
    const ramps = [rampOrder('ramp-dup', 200, '0xabc123' as Hex)];

    const items = mergeMoneyActivity(onchain, [], ramps);

    expect(items.map((i) => i.id)).toEqual(['dup']);
  });

  it('returns an empty list when both sources are empty', () => {
    expect(mergeMoneyActivity([], [])).toEqual([]);
  });

  it('orders rows sharing a timestamp deterministically by id', () => {
    // A spend and its cashback can settle in the same second; the tie must
    // resolve the same way regardless of input order.
    const onchain = [onchainTx('zzz', 100)];
    const api = [cardTx('0xccc' as Hex, 100), cashbackTx('0xaaa' as Hex, 100)];

    const forward = mergeMoneyActivity(onchain, api).map((i) => i.id);
    const reversed = mergeMoneyActivity([...onchain], [...api].reverse()).map(
      (i) => i.id,
    );

    expect(forward).toEqual(['0xaaa', '0xccc', 'zzz']);
    expect(reversed).toEqual(forward);
  });
});

describe('buildMoneyActivityBuckets', () => {
  const onchain = {
    all: [onchainTx('all', 50)],
    deposits: [onchainTx('dep', 40)],
    transfers: [onchainTx('xfer', 30)],
  };
  const card = cardTx('0xcard' as Hex, 200);
  const cashback = cashbackTx('0xback' as Hex, 300);
  const ramp = rampOrder('ramp-order', 400);

  it('routes card spends to Transfers and cashback to Deposits; both into All', () => {
    const buckets = buildMoneyActivityBuckets(
      onchain,
      [card, cashback],
      [ramp],
    );

    const ids = (filter: MoneyActivityFilter) =>
      buckets[filter].map((i) => i.id);

    // All contains both API rows.
    expect(ids(MoneyActivityFilter.All)).toEqual(
      expect.arrayContaining(['0xback', '0xcard', 'ramp-order', 'all']),
    );
    // Deposits: cashback inflow, not the card spend.
    expect(ids(MoneyActivityFilter.Deposits)).toContain('0xback');
    expect(ids(MoneyActivityFilter.Deposits)).toContain('ramp-order');
    expect(ids(MoneyActivityFilter.Deposits)).not.toContain('0xcard');
    // Transfers: card outflow, not the cashback.
    expect(ids(MoneyActivityFilter.Transfers)).toContain('0xcard');
    expect(ids(MoneyActivityFilter.Transfers)).not.toContain('0xback');
    expect(ids(MoneyActivityFilter.Transfers)).not.toContain('ramp-order');
  });

  it('keeps each bucket time-descending', () => {
    const buckets = buildMoneyActivityBuckets(onchain, [card, cashback]);
    const times = buckets[MoneyActivityFilter.All].map((i) => i.time);
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});
