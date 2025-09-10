import { SolScope } from '@metamask/keyring-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { CaipChainId, Hex } from '@metamask/utils';
import {
  BRIDGE_DEV_API_BASE_URL,
  BRIDGE_PROD_API_BASE_URL,
} from '@metamask/bridge-controller';
import { NETWORK_CHAIN_ID } from '../util/networks/customNetworks';

// TODO read from feature flags...
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
  // TODO: Update to use CHAIN_IDS.SEI when it is added to the transaction controller
  NETWORK_CHAIN_ID.SEI_MAINNET,
  SolScope.Mainnet as const,
];

export type AllowedBridgeChainIds = (typeof ALLOWED_BRIDGE_CHAIN_IDS)[number];

export const ETH_USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';

export const NETWORK_TO_SHORT_NETWORK_NAME_MAP: Record<
  Hex | CaipChainId,
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
  // TODO: Update to use CHAIN_IDS.SEI when it is added to the transaction controller
  [NETWORK_CHAIN_ID.SEI_MAINNET]: 'Sei',
  [SolScope.Mainnet]: 'Solana',
};

export const BRIDGE_API_BASE_URL =
  process.env.BRIDGE_USE_DEV_APIS === 'true'
    ? BRIDGE_DEV_API_BASE_URL
    : BRIDGE_PROD_API_BASE_URL;
