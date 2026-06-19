import type { ActivityListItem } from '../types';
import { mergeActivityItems } from './dedup';

const makeItem = (
  source: string,
  timestamp: number,
  hash?: string,
): ActivityListItem =>
  ({
    type: 'send',
    chainId: 'eip155:1',
    status: 'success',
    timestamp,
    hash,
    data: {},
    raw: { type: source, data: {} },
  }) as unknown as ActivityListItem;

describe('mergeActivityItems', () => {
  it('lets confirmed EVM items win over local duplicates and sorts newest first', () => {
    const localDuplicate = makeItem('localTransaction', 1, '0xABC');
    const confirmed = makeItem('apiEvmTransaction', 2, '0xabc');
    const nonEvm = makeItem('keyringTransaction', 3, 'solana-hash');

    expect(mergeActivityItems([localDuplicate], [confirmed], [nonEvm])).toEqual(
      [nonEvm, confirmed],
    );
  });

  it('keeps hashless items because there is no stable dedup key', () => {
    const local = makeItem('localTransaction', 1);
    const confirmed = makeItem('apiEvmTransaction', 2);

    expect(mergeActivityItems([local], [confirmed], [])).toEqual([
      confirmed,
      local,
    ]);
  });
});
