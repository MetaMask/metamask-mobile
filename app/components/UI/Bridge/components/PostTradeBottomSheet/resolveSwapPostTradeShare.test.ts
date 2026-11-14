import { isUnsupportedPostTradeAsset } from '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/quoteTokens';
import type { PostTradePrompt } from '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/resolvePostTradePrompt';
import type { BridgeToken } from '../../types';
import { resolveSwapSocialPostTrade } from './resolveSwapPostTradeShare';

jest.mock(
  '../../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/quoteTokens',
  () => ({ isUnsupportedPostTradeAsset: jest.fn() }),
);

const ETH_NATIVE: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  chainId: '0x1',
  decimals: 18,
};
const USDC_ETH: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  chainId: '0x1',
  decimals: 6,
};
const USDC_BASE: BridgeToken = {
  address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  symbol: 'USDC',
  chainId: '0x2105',
  decimals: 6,
};
const PEPE_ETH: BridgeToken = {
  address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  symbol: 'PEPE',
  chainId: '0x1',
  decimals: 18,
};
const PEPE_BASE: BridgeToken = {
  address: '0x52b492a33e447cdb854c7fc19f1e57e8bfa1777d',
  symbol: 'PEPE',
  chainId: '0x2105',
  decimals: 18,
};
const ARB_TOKEN: BridgeToken = {
  address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
  symbol: 'ARB',
  chainId: '0xa4b1',
  decimals: 18,
};

// Natives and stables. The real check reads these from the quote-token cache.
const QUOTE_ADDRESSES = new Set([
  ETH_NATIVE.address,
  USDC_ETH.address,
  USDC_BASE.address,
]);

const COUNT_KEY = {
  address: '0x1111111111111111111111111111111111111111',
  product: 'swaps' as const,
};
const SHARE_SHEET: PostTradePrompt = {
  kind: 'share_sheet',
  countKey: COUNT_KEY,
};

const resolve = (
  overrides: Partial<Parameters<typeof resolveSwapSocialPostTrade>[0]> = {},
) =>
  resolveSwapSocialPostTrade({
    prompt: SHARE_SHEET,
    sourceToken: USDC_ETH,
    destToken: PEPE_ETH,
    sourceUsd: '25',
    ...overrides,
  });

describe('resolveSwapSocialPostTrade', () => {
  beforeEach(() => {
    jest
      .mocked(isUnsupportedPostTradeAsset)
      .mockImplementation((address) =>
        QUOTE_ADDRESSES.has(address.toLowerCase()),
      );
  });

  it('returns a buy of the received token on the same chain', () => {
    expect(resolve({ sourceUsd: '10' })).toEqual({
      countKey: COUNT_KEY,
      tradeInFlightChain: 'ethereum',
      txHash: 'submitted',
      preview: {
        tokenSymbol: 'PEPE',
        tokenAddress: PEPE_ETH.address,
        chain: 'ethereum',
        side: 'buy',
        costLabel: '$10.00',
      },
    });
  });

  it('accepts exactly $10 and rejects anything below it', () => {
    expect(resolve({ sourceUsd: '9.99' })).toBeUndefined();
    expect(resolve({ sourceUsd: '10' })).toBeDefined();
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['non-numeric', 'abc'],
  ])('returns nothing when the USD value is %s', (_label, sourceUsd) => {
    expect(resolve({ sourceUsd })).toBeUndefined();
  });

  it.each<[string, PostTradePrompt]>([
    ['none', { kind: 'none' }],
    ['claim_sheet', { kind: 'claim_sheet' }],
    ['post_to_feed_toast', { kind: 'post_to_feed_toast' }],
  ])('returns nothing when the prompt is %s', (_label, prompt) => {
    expect(resolve({ prompt })).toBeUndefined();
  });

  it('returns nothing for a quote-to-quote swap', () => {
    expect(
      resolve({ sourceToken: ETH_NATIVE, destToken: USDC_ETH }),
    ).toBeUndefined();
  });

  it('returns a sell of the sold token when the received token is a quote asset', () => {
    expect(
      resolve({ sourceToken: PEPE_ETH, destToken: USDC_ETH }),
    ).toMatchObject({
      txHash: 'submitted',
      tradeInFlightChain: 'ethereum',
      preview: {
        tokenSymbol: 'PEPE',
        tokenAddress: PEPE_ETH.address,
        side: 'sell',
      },
    });
  });

  it('shares the destination hash for a bridged buy', () => {
    expect(
      resolve({ sourceToken: USDC_ETH, destToken: PEPE_BASE }),
    ).toMatchObject({
      tradeInFlightChain: 'base',
      txHash: 'destination',
      preview: {
        tokenSymbol: 'PEPE',
        tokenAddress: PEPE_BASE.address,
        chain: 'base',
        side: 'buy',
      },
    });
  });

  it('shares the submitted hash for a bridged sell', () => {
    expect(
      resolve({ sourceToken: PEPE_ETH, destToken: USDC_BASE }),
    ).toMatchObject({
      tradeInFlightChain: 'ethereum',
      txHash: 'submitted',
      preview: { side: 'sell', tokenAddress: PEPE_ETH.address },
    });
  });

  it('returns nothing when the position is on an unsupported chain', () => {
    expect(
      resolve({ sourceToken: USDC_ETH, destToken: ARB_TOKEN }),
    ).toBeUndefined();
  });

  it('does not fall back to the sold side when the received position is unsupported', () => {
    expect(
      resolve({ sourceToken: PEPE_ETH, destToken: ARB_TOKEN }),
    ).toBeUndefined();
  });

  it('returns nothing without both tokens', () => {
    expect(resolve({ sourceToken: undefined })).toBeUndefined();
    expect(resolve({ destToken: undefined })).toBeUndefined();
  });
});
