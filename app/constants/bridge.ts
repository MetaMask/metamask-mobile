import { SolScope, BtcScope, TrxScope } from '@metamask/keyring-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { CaipChainId, Hex } from '@metamask/utils';
import {
  BRIDGE_DEV_API_BASE_URL,
  BRIDGE_PROD_API_BASE_URL,
} from '@metamask/bridge-controller';

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
  [CHAIN_IDS.MAINNET]: 'Ethereum',
  [CHAIN_IDS.LINEA_MAINNET]: 'Linea',
  [CHAIN_IDS.POLYGON]: 'Polygon',
  [CHAIN_IDS.AVALANCHE]: 'Avalanche',
  [CHAIN_IDS.BSC]: 'BNB',
  [CHAIN_IDS.ARBITRUM]: 'Arbitrum',
  [CHAIN_IDS.OPTIMISM]: 'Optimism',
  [CHAIN_IDS.ZKSYNC_ERA]: 'zkSync',
  [CHAIN_IDS.BASE]: 'Base',
  [CHAIN_IDS.SEI]: 'Sei',
  [CHAIN_IDS.MONAD]: 'Monad',
  [SolScope.Mainnet]: 'Solana',
  [BtcScope.Mainnet]: 'Bitcoin',
  [TrxScope.Mainnet]: 'Tron',
};

export const BRIDGE_API_BASE_URL =
  process.env.BRIDGE_USE_DEV_APIS === 'true'
    ? BRIDGE_DEV_API_BASE_URL
    : BRIDGE_PROD_API_BASE_URL;
