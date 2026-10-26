import type { CaipChainId } from '@metamask/utils';
import type { SocialAssetClass } from '../types';

/**
 * CAIP-2 chain ids requested on every Trader Feed fetch. Matches the feed
 * supported set in va-mmcx-social-api (`SUPPORTED_CAIP2_CHAIN_IDS`). Clicker
 * defaults to spot-only chains when `chains` is omitted, so we pass the full
 * set explicitly to include Hyperliquid perps.
 */
export const FEED_CAIP2_CHAINS: readonly CaipChainId[] = [
  'eip155:8453', // base
  'eip155:1', // ethereum
  'eip155:56', // bsc
  'eip155:4663', // robinhood
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // solana mainnet
  'eip155:999', // hyperliquid
];

const HYPERLIQUID_CAIP2: CaipChainId = 'eip155:999';

/**
 * Chains the global feed requests per asset class. `all` must stay the exact
 * `FEED_CAIP2_CHAINS` array: it is part of the query key V0's trader feed
 * shares.
 */
export const FEED_CAIP2_CHAINS_BY_ASSET_CLASS: Record<
  SocialAssetClass,
  readonly CaipChainId[]
> = {
  all: FEED_CAIP2_CHAINS,
  tokens: FEED_CAIP2_CHAINS.filter((chain) => chain !== HYPERLIQUID_CAIP2),
  perps: [HYPERLIQUID_CAIP2],
};
