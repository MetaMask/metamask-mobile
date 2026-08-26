import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  createDraftFromTokens,
  deriveDisplayTokens,
  getStorageOrderFromDraft,
  hasOrderChanged,
  normalizeAssetId,
  ordersMatch,
  removeFromDraftOrder,
  reorderDraftOrder,
} from './watchlistEditDraft.utils';

const makeToken = (name: string): TrendingAsset =>
  ({
    assetId: `eip155:1/erc20:0x${name}`,
    name,
    symbol: name.toUpperCase(),
  }) as TrendingAsset;

describe('watchlistEditDraft.utils', () => {
  describe('normalizeAssetId', () => {
    it('lowercases asset ids', () => {
      expect(normalizeAssetId('EIP155:1/ERC20:0xABC')).toBe(
        'eip155:1/erc20:0xabc',
      );
    });
  });

  describe('createDraftFromTokens', () => {
    it('captures newest-first normalized ids', () => {
      const tokens = [makeToken('sol'), makeToken('btc'), makeToken('eth')];
      expect(createDraftFromTokens(tokens)).toEqual({
        order: [
          'eip155:1/erc20:0xsol',
          'eip155:1/erc20:0xbtc',
          'eip155:1/erc20:0xeth',
        ],
      });
    });
  });

  describe('deriveDisplayTokens', () => {
    const queryTokens = [makeToken('sol'), makeToken('btc'), makeToken('eth')];

    it('returns query tokens when draft is null', () => {
      expect(deriveDisplayTokens(queryTokens, null)).toEqual(queryTokens);
    });

    it('preserves draft order and omits ids missing from query', () => {
      const draft = {
        order: [
          'eip155:1/erc20:0xbtc',
          'eip155:1/erc20:0xsol',
          'eip155:1/erc20:0xmissing',
        ],
      };

      expect(deriveDisplayTokens(queryTokens, draft)).toEqual([
        makeToken('btc'),
        makeToken('sol'),
      ]);
    });
  });

  describe('reorderDraftOrder', () => {
    it('moves an id from one index to another', () => {
      const order = ['a', 'b', 'c'];
      expect(reorderDraftOrder(order, 0, 2)).toEqual(['b', 'c', 'a']);
    });
  });

  describe('removeFromDraftOrder', () => {
    it('removes a normalized id from order', () => {
      const order = ['eip155:1/erc20:0xbtc', 'eip155:1/erc20:0xsol'];
      expect(removeFromDraftOrder(order, 'EIP155:1/ERC20:0xBTC')).toEqual([
        'eip155:1/erc20:0xsol',
      ]);
    });
  });

  describe('getStorageOrderFromDraft', () => {
    it('reverses draft order and filters ids absent from query', () => {
      const draft = {
        order: [
          'eip155:1/erc20:0xbtc',
          'eip155:1/erc20:0xsol',
          'eip155:1/erc20:0xremoved',
        ],
      };
      const queryAssetIdSet = new Set([
        'eip155:1/erc20:0xbtc',
        'eip155:1/erc20:0xsol',
        'eip155:1/erc20:0xeth',
      ]);

      expect(getStorageOrderFromDraft(draft, queryAssetIdSet)).toEqual([
        'eip155:1/erc20:0xsol',
        'eip155:1/erc20:0xbtc',
      ]);
    });

    it('uses full draft order when query set is empty', () => {
      const draft = {
        order: ['eip155:1/erc20:0xbtc', 'eip155:1/erc20:0xsol'],
      };

      expect(getStorageOrderFromDraft(draft, new Set())).toEqual([
        'eip155:1/erc20:0xsol',
        'eip155:1/erc20:0xbtc',
      ]);
    });

    it('returns empty array for intentional unwatch-all with empty query', () => {
      expect(getStorageOrderFromDraft({ order: [] }, new Set())).toEqual([]);
    });
  });

  describe('ordersMatch', () => {
    it('returns true when orders are identical', () => {
      const order = ['eip155:1/erc20:0xsol', 'eip155:1/erc20:0xbtc'];
      expect(ordersMatch(order, [...order])).toBe(true);
    });

    it('returns true when orders differ only by casing', () => {
      expect(
        ordersMatch(['EIP155:1/ERC20:0xSOL'], ['eip155:1/erc20:0xsol']),
      ).toBe(true);
    });

    it('returns false when order length differs', () => {
      expect(
        ordersMatch(
          ['eip155:1/erc20:0xsol'],
          ['eip155:1/erc20:0xsol', 'eip155:1/erc20:0xbtc'],
        ),
      ).toBe(false);
    });

    it('returns false when item positions differ', () => {
      expect(
        ordersMatch(
          ['eip155:1/erc20:0xsol', 'eip155:1/erc20:0xbtc'],
          ['eip155:1/erc20:0xbtc', 'eip155:1/erc20:0xsol'],
        ),
      ).toBe(false);
    });
  });

  describe('hasOrderChanged', () => {
    const queryTokens = [makeToken('sol'), makeToken('btc'), makeToken('eth')];
    const queryAssetIdSet = new Set([
      'eip155:1/erc20:0xsol',
      'eip155:1/erc20:0xbtc',
      'eip155:1/erc20:0xeth',
    ]);

    it('returns false when draft order matches query order', () => {
      expect(
        hasOrderChanged(
          [
            'eip155:1/erc20:0xsol',
            'eip155:1/erc20:0xbtc',
            'eip155:1/erc20:0xeth',
          ],
          queryTokens,
          queryAssetIdSet,
        ),
      ).toBe(false);
    });

    it('returns true when draft order differs', () => {
      expect(
        hasOrderChanged(
          [
            'eip155:1/erc20:0xbtc',
            'eip155:1/erc20:0xsol',
            'eip155:1/erc20:0xeth',
          ],
          queryTokens,
          queryAssetIdSet,
        ),
      ).toBe(true);
    });

    it('returns true when filtered draft length differs from query', () => {
      expect(
        hasOrderChanged(['eip155:1/erc20:0xsol'], queryTokens, queryAssetIdSet),
      ).toBe(true);
    });

    it('ignores draft ids absent from query when comparing order', () => {
      const partialQuerySet = new Set([
        'eip155:1/erc20:0xsol',
        'eip155:1/erc20:0xeth',
      ]);

      expect(
        hasOrderChanged(
          [
            'eip155:1/erc20:0xbtc',
            'eip155:1/erc20:0xsol',
            'eip155:1/erc20:0xeth',
          ],
          [makeToken('sol'), makeToken('eth')],
          partialQuerySet,
        ),
      ).toBe(false);
    });
  });
});
