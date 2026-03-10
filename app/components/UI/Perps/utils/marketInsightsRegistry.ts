import type { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { getTrendingTokenImageUrl } from '../../Trending/utils/getTrendingTokenImageUrl';

const BITCOIN_CHAIN_ID =
  'bip122:000000000019d6689c085ae165831e93' as CaipChainId;
const BITCOIN_ASSET_ID = `${BITCOIN_CHAIN_ID}/slip44:0` as CaipAssetType;

const ETHEREUM_CHAIN_ID = 'eip155:1' as Hex;
const ETHEREUM_ASSET_ID = `${ETHEREUM_CHAIN_ID}/slip44:60` as CaipAssetType;

const SOLANA_CHAIN_ID =
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as CaipChainId;
const SOLANA_ASSET_ID = `${SOLANA_CHAIN_ID}/slip44:501` as CaipAssetType;

export interface PerpsMarketInsightsAssetMetadata {
  caip19Id: CaipAssetType;
  tokenAddress?: string;
  tokenChainId: Hex | CaipChainId;
  tokenDecimals: number;
  tokenName: string;
  tokenImageUrl: string;
}

const MARKET_INSIGHTS_REGISTRY: Record<
  string,
  PerpsMarketInsightsAssetMetadata
> = {
  BTC: {
    caip19Id: BITCOIN_ASSET_ID,
    tokenAddress: BITCOIN_ASSET_ID,
    tokenChainId: BITCOIN_CHAIN_ID,
    tokenDecimals: 8,
    tokenName: 'Bitcoin',
    tokenImageUrl: getTrendingTokenImageUrl(BITCOIN_ASSET_ID),
  },
  ETH: {
    caip19Id: ETHEREUM_ASSET_ID,
    tokenChainId: ETHEREUM_CHAIN_ID,
    tokenDecimals: 18,
    tokenName: 'Ethereum',
    tokenImageUrl: getTrendingTokenImageUrl(ETHEREUM_ASSET_ID),
  },
  SOL: {
    caip19Id: SOLANA_ASSET_ID,
    tokenAddress: SOLANA_ASSET_ID,
    tokenChainId: SOLANA_CHAIN_ID,
    tokenDecimals: 9,
    tokenName: 'Solana',
    tokenImageUrl: getTrendingTokenImageUrl(SOLANA_ASSET_ID),
  },
};

/**
 * Returns canonical Market Insights metadata for supported Perps symbols.
 * Unmapped or non-crypto symbols intentionally return null.
 */
export const getPerpsMarketInsightsAssetMetadata = (
  symbol?: string | null,
): PerpsMarketInsightsAssetMetadata | null => {
  const lookupSymbol = symbol?.trim().toUpperCase();

  if (!lookupSymbol) {
    return null;
  }

  return MARKET_INSIGHTS_REGISTRY[lookupSymbol] ?? null;
};
