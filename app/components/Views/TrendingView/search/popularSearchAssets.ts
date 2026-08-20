import type { TrendingAsset } from '@metamask/assets-controllers';

/** Default BTC / ETH / SOL pills shown on zero-result search surfaces. */
export const POPULAR_SEARCH_ASSETS: TrendingAsset[] = [
  {
    assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
    symbol: 'BTC',
    name: 'Bitcoin',
  },
  {
    assetId: 'eip155:1/slip44:60',
    symbol: 'ETH',
    name: 'Ethereum',
  },
  {
    assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    symbol: 'SOL',
    name: 'Solana',
  },
] as TrendingAsset[];
