import {
  mockClosedPerpsFeedItem,
  mockClosedSpotFeedItem,
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../mocks/socialV1Feed.mock';
import { isCopyTradeable, toSpotCopyTradeTarget } from './copyTrade';

describe('isCopyTradeable', () => {
  it('accepts an open perps position', () => {
    expect(isCopyTradeable(mockOpenPerpsFeedItem())).toBe(true);
  });

  it('accepts an open spot position', () => {
    expect(isCopyTradeable(mockOpenSpotFeedItem())).toBe(true);
  });

  // Nothing is left to mirror once the position is gone.
  it('rejects a closed perps position', () => {
    expect(isCopyTradeable(mockClosedPerpsFeedItem())).toBe(false);
  });

  it('rejects a closed spot position', () => {
    expect(isCopyTradeable(mockClosedSpotFeedItem())).toBe(false);
  });

  it('hides copy trade on a composer perps preview', () => {
    expect(
      isCopyTradeable({
        ...mockOpenPerpsFeedItem(),
        showCopyTrade: false,
      }),
    ).toBe(false);
  });

  it('defers to the flag on a composer spot share', () => {
    const share = {
      ...mockOpenSpotFeedItem(),
      variant: 'spotShare' as const,
    };

    expect(isCopyTradeable({ ...share, showCopyTrade: true })).toBe(true);
    expect(isCopyTradeable({ ...share, showCopyTrade: false })).toBe(false);
    expect(isCopyTradeable(share)).toBe(false);
  });
});

describe('toSpotCopyTradeTarget', () => {
  it('builds the Quick Buy target for an open spot position', () => {
    expect(toSpotCopyTradeTarget(mockOpenSpotFeedItem())).toEqual({
      tokenAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
      tokenSymbol: 'PUMP',
      tokenName: 'PUMP',
      chain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    });
  });

  it('builds the target for a composer spot share', () => {
    const share = {
      ...mockOpenSpotFeedItem(),
      variant: 'spotShare' as const,
      showCopyTrade: true,
    };

    expect(toSpotCopyTradeTarget(share)?.tokenSymbol).toBe('PUMP');
  });

  it('prefers the token name and trims the address', () => {
    const item = mockOpenSpotFeedItem();

    expect(
      toSpotCopyTradeTarget({
        ...item,
        asset: {
          ...item.asset,
          name: 'Pump',
          avatar: { ...item.asset.avatar, tokenAddress: '  0xabc  ' },
        },
      }),
    ).toEqual(
      expect.objectContaining({ tokenAddress: '0xabc', tokenName: 'Pump' }),
    );
  });

  it('returns undefined for a perps position', () => {
    expect(toSpotCopyTradeTarget(mockOpenPerpsFeedItem())).toBeUndefined();
  });

  it('returns undefined for an unsupported chain', () => {
    const item = mockOpenSpotFeedItem();

    expect(
      toSpotCopyTradeTarget({
        ...item,
        asset: {
          ...item.asset,
          avatar: { ...item.asset.avatar, chain: 'tron' },
        },
      }),
    ).toBeUndefined();
  });

  it('returns undefined for a blank token address', () => {
    const item = mockOpenSpotFeedItem();

    expect(
      toSpotCopyTradeTarget({
        ...item,
        asset: {
          ...item.asset,
          avatar: { ...item.asset.avatar, tokenAddress: '   ' },
        },
      }),
    ).toBeUndefined();
  });
});
