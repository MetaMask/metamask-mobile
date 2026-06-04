import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { mergeMoneyActivity } from './useMoneyActivityItems';
import type { CardTransaction } from '../types/moneyActivity';

const onchainTx = (id: string, time: number, hash?: Hex): TransactionMeta =>
  ({ id, time, hash }) as TransactionMeta;

const cardTx = (hash: Hex, time: number): CardTransaction => ({
  hash,
  time,
  chainId: '0x8f',
  token: { address: '0xusdc' as Hex, symbol: 'USDC', decimals: 6 },
  amount: '1000000',
  to: '0xsettlement' as Hex,
});

describe('mergeMoneyActivity', () => {
  it('merges both sources, tags by kind, and sorts time-descending', () => {
    const onchain = [onchainTx('a', 100), onchainTx('b', 300)];
    const cards = [cardTx('0xcard' as Hex, 200)];

    const items = mergeMoneyActivity(onchain, cards);

    expect(items.map((i) => [i.kind, i.id, i.time])).toEqual([
      ['onchain', 'b', 300],
      ['card', '0xcard', 200],
      ['onchain', 'a', 100],
    ]);
  });

  it('drops an on-chain row that collides with a card hash (double-count guard)', () => {
    const shared = '0xAbC123' as Hex;
    const onchain = [onchainTx('dup', 100, shared)];
    const cards = [cardTx('0xabc123' as Hex, 100)];

    const items = mergeMoneyActivity(onchain, cards);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'card', id: '0xabc123' });
  });

  it('returns an empty list when both sources are empty', () => {
    expect(mergeMoneyActivity([], [])).toEqual([]);
  });
});
