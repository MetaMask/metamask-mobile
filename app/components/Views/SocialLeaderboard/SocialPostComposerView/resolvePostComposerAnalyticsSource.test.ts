import { resolvePostComposerAnalyticsSource } from './resolvePostComposerAnalyticsSource';

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
});
