import { CHAIN_IDS } from '@metamask/transaction-controller';

// TODO read from feature flags
export const ALLOWED_BRIDGE_CHAIN_IDS = [
    CHAIN_IDS.MAINNET,
    CHAIN_IDS.BSC,
    CHAIN_IDS.POLYGON,
    CHAIN_IDS.ZKSYNC_ERA,
    CHAIN_IDS.AVALANCHE,
    CHAIN_IDS.OPTIMISM,
    CHAIN_IDS.ARBITRUM,
    CHAIN_IDS.LINEA_MAINNET,
    CHAIN_IDS.BASE,
  ];

export type AllowedBridgeChainIds = (typeof ALLOWED_BRIDGE_CHAIN_IDS)[number];

export const ETH_USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';

export const NETWORK_TO_SHORT_NETWORK_NAME_MAP: Record<
  AllowedBridgeChainIds,
  string
> = {
  [CHAIN_IDS.MAINNET]: 'Ethereum',
  [CHAIN_IDS.LINEA_MAINNET]: 'Linea',
  [CHAIN_IDS.POLYGON]: 'Polygon',
  [CHAIN_IDS.AVALANCHE]: 'Avalanche',
  [CHAIN_IDS.BSC]: 'Binance Smart Chain',
  [CHAIN_IDS.ARBITRUM]: 'Arbitrum',
  [CHAIN_IDS.OPTIMISM]: 'Optimism',
  [CHAIN_IDS.ZKSYNC_ERA]: 'ZkSync Era',
  [CHAIN_IDS.BASE]: 'Base',
};
