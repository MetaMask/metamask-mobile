import type { ActivityListItem } from './types';
import { GAS_FEE_SPONSORED, mergeActivityItemSponsoredFees } from './fees';

function makeSendItem(data: Record<string, unknown>): ActivityListItem {
  return {
    chainId: 'eip155:1',
    data,
    hash: '0xhash',
    status: 'success',
    timestamp: 1,
    type: 'send',
  } as unknown as ActivityListItem;
}

describe('activity adapter fees', () => {
  describe('mergeActivityItemSponsoredFees', () => {
    it('replaces the target base fee with the source sponsored fee marker', () => {
      const sourceItem = makeSendItem({
        from: '0xfrom',
        to: '0xto',
        fees: [{ type: GAS_FEE_SPONSORED }],
      });
      const targetItem = makeSendItem({
        from: '0xfrom',
        to: '0xto',
        fees: [
          { type: 'base', amount: '21000', decimals: 18, symbol: 'MON' },
          { type: 'bridge', amount: '100', decimals: 6, symbol: 'USDC' },
        ],
        token: {
          amount: '1000000',
          decimals: 6,
          direction: 'out',
          symbol: 'USDC',
        },
      });

      expect(
        mergeActivityItemSponsoredFees(sourceItem, targetItem),
      ).toStrictEqual({
        ...targetItem,
        data: {
          ...targetItem.data,
          fees: [
            { type: GAS_FEE_SPONSORED },
            { type: 'bridge', amount: '100', decimals: 6, symbol: 'USDC' },
          ],
        },
      });
    });

    it('returns the target item unchanged when the source has no sponsored fee', () => {
      const sourceItem = makeSendItem({
        from: '0xfrom',
        to: '0xto',
        fees: [{ type: 'base', amount: '21000', decimals: 18, symbol: 'MON' }],
      });
      const targetItem = makeSendItem({
        from: '0xfrom',
        to: '0xto',
        fees: [{ type: 'base', amount: '21000', decimals: 18, symbol: 'MON' }],
      });

      expect(mergeActivityItemSponsoredFees(sourceItem, targetItem)).toBe(
        targetItem,
      );
    });

    it('returns the target item unchanged when it cannot carry fees', () => {
      const sourceItem = makeSendItem({
        from: '0xfrom',
        to: '0xto',
        fees: [{ type: GAS_FEE_SPONSORED }],
      });
      const targetItem: ActivityListItem = {
        chainId: 'eip155:1',
        data: {
          sourceToken: { direction: 'out', symbol: 'MON' },
        },
        hash: '0xhash',
        status: 'success',
        timestamp: 1,
        type: 'swapIncomplete',
      };

      expect(mergeActivityItemSponsoredFees(sourceItem, targetItem)).toBe(
        targetItem,
      );
    });
  });
});
