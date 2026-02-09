import { SolScope, BtcScope, TrxScope } from '@metamask/keyring-api';
import { CaipChainId, Hex } from '@metamask/utils';
import {
  BRIDGE_DEV_API_BASE_URL,
  BRIDGE_PROD_API_BASE_URL,
} from '@metamask/bridge-controller';
import { NETWORK_CHAIN_ID } from '../util/networks/customNetworks';

/**
 * Native token address (zero address)
 * Used to represent native tokens (ETH, BNB, MATIC, etc.) across all EVM chains
 */
export const NATIVE_SWAPS_TOKEN_ADDRESS: Hex =
  '0x0000000000000000000000000000000000000000';

export const ETH_USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';

export const NETWORK_TO_SHORT_NETWORK_NAME_MAP: Record<
  Hex | CaipChainId,
  string
> = {
  [NETWORK_CHAIN_ID.MAINNET]: 'Ethereum',
  [NETWORK_CHAIN_ID.LINEA_MAINNET]: 'Linea',
  [NETWORK_CHAIN_ID.POLYGON]: 'Polygon',
  [NETWORK_CHAIN_ID.AVALANCHE]: 'Avalanche',
  [NETWORK_CHAIN_ID.BSC]: 'BNB',
  [NETWORK_CHAIN_ID.ARBITRUM]: 'Arbitrum',
  [NETWORK_CHAIN_ID.OPTIMISM]: 'Optimism',
  [NETWORK_CHAIN_ID.ZKSYNC_ERA]: 'zkSync',
  [NETWORK_CHAIN_ID.BASE]: 'Base',
  [NETWORK_CHAIN_ID.SEI]: 'Sei',
  [NETWORK_CHAIN_ID.MONAD]: 'Monad',
  [NETWORK_CHAIN_ID.HYPE]: 'HyperEVM',
  [SolScope.Mainnet]: 'Solana',
  [BtcScope.Mainnet]: 'BTC',
  [TrxScope.Mainnet]: 'Tron',
};

export const BRIDGE_API_BASE_URL =
  process.env.BRIDGE_USE_DEV_APIS === 'true'
    ? BRIDGE_DEV_API_BASE_URL
    : BRIDGE_PROD_API_BASE_URL;
