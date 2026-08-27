import type { CaipChainId } from '@metamask/utils';

/**
 * CAIP-2 chain ids requested on every Trader Feed fetch. Matches the feed
 * supported set in va-mmcx-social-api (`SUPPORTED_CAIP2_CHAIN_IDS`). Clicker
 * defaults to spot-only chains when `chains` is omitted, so we pass the full
 * set explicitly to include Hyperliquid perps.
 */
export const FEED_CAIP2_CHAINS: readonly CaipChainId[] = [
  'eip155:8453', // base
  'eip155:1', // ethereum
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', // solana mainnet
  'eip155:999', // hyperliquid
];
