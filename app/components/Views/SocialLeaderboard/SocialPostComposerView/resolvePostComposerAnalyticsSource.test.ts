import {
  resolvePostComposerAnalyticsSource,
  resolvePostComposerEntry,
} from './resolvePostComposerAnalyticsSource';

const preview = {
  tokenSymbol: 'ETH',
  tokenAddress: '0xeth',
  chain: 'eip155:1',
  side: 'buy' as const,
};

describe('resolvePostComposerAnalyticsSource', () => {
  it('uses the trade entry point when it is set', () => {
    expect(
      resolvePostComposerAnalyticsSource({
        tradeInFlight: {
          transactionHash: '0x1',
          chain: 'eip155:1',
          tokenAddress: '0xeth',
        },
        preview,
        analyticsSource: 'social_following',
      }),
    ).toBe('social_following');
  });

  it('omits source for a trade share that has no entry point', () => {
    expect(
      resolvePostComposerAnalyticsSource({
        tradeInFlight: {
          transactionHash: '0x1',
          chain: 'eip155:1',
          tokenAddress: '0xeth',
        },
        preview,
      }),
    ).toBeUndefined();
  });

  it('keeps the perps and token-details entry points', () => {
    expect(
      resolvePostComposerAnalyticsSource({
        position: { positionId: 'pos-1' } as never,
        entryPoint: 'perps',
      }),
    ).toBe('perp_asset_screen');
    expect(
      resolvePostComposerAnalyticsSource({
        position: { positionId: 'pos-1' } as never,
        entryPoint: 'token_details',
      }),
    ).toBe('asset_details');
  });

  it('omits an unknown entry point', () => {
    expect(resolvePostComposerAnalyticsSource(undefined)).toBeUndefined();
    expect(
      resolvePostComposerAnalyticsSource({
        tradeInFlight: {
          transactionHash: '0x1',
          chain: 'eip155:1',
          tokenAddress: '0xeth',
        },
        preview,
        analyticsSource: 'not-a-source' as 'social_trending',
      }),
    ).toBeUndefined();
  });

  it('maps a blank token-details post to asset_details', () => {
    expect(
      resolvePostComposerAnalyticsSource({ composerEntry: 'token_details' }),
    ).toBe('asset_details');
  });
});

describe('resolvePostComposerEntry', () => {
  it('reads a spot and a perps trade share', () => {
    expect(
      resolvePostComposerEntry({
        tradeInFlight: {
          transactionHash: '0x1',
          chain: 'eip155:1',
          tokenAddress: '0xeth',
        },
        preview,
      }),
    ).toBe('post_trade_spot');
    expect(
      resolvePostComposerEntry({
        tradeInFlight: {
          orderId: 'order-1',
          chain: 'hyperliquid',
          tokenAddress: 'BTC',
        },
        preview: {
          product: 'perps',
          tokenSymbol: 'BTC',
          tradeSymbol: 'BTC',
          tokenAddress: 'BTC',
          direction: 'long',
        },
      }),
    ).toBe('post_trade_perps');
  });

  it('reads a held position from perps or token details', () => {
    expect(
      resolvePostComposerEntry({
        position: { positionId: 'pos-1' } as never,
        entryPoint: 'perps',
      }),
    ).toBe('perps_position');
    expect(
      resolvePostComposerEntry({
        position: { positionId: 'pos-1' } as never,
        entryPoint: 'token_details',
      }),
    ).toBe('token_details');
  });

  it('keeps a blank post entry and omits an unknown open', () => {
    expect(resolvePostComposerEntry({ composerEntry: 'my_profile' })).toBe(
      'my_profile',
    );
    expect(resolvePostComposerEntry(undefined)).toBeUndefined();
  });
});
