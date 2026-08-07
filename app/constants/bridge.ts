import { SolScope, BtcScope, TrxScope, XlmScope } from '@metamask/keyring-api';
import { CaipChainId, Hex } from '@metamask/utils';
import {
  BRIDGE_DEV_API_BASE_URL,
  BRIDGE_PROD_API_BASE_URL,
  BRIDGE_UAT_API_BASE_URL,
  QuoteMetadataMigrationPhase,
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
  [NETWORK_CHAIN_ID.MEGAETH_MAINNET]: 'MegaETH',
  [NETWORK_CHAIN_ID.ARC]: 'Arc',
  [NETWORK_CHAIN_ID.ROBINHOOD_CHAIN]: 'Robinhood',
  [SolScope.Mainnet]: 'Solana',
  [BtcScope.Mainnet]: 'BTC',
  [TrxScope.Mainnet]: 'Tron',
  [XlmScope.Pubnet]: 'Stellar',
};

/**
 * Resolves the Bridge API base URL to use based on the current MetaMask
 * environment.
 *
 * `BRIDGE_USE_CUSTOM_BASE_URL` lets developers point the app at a custom Bridge
 * API deployment (e.g. a local server or a one-off environment), bypassing the
 * environment-based mapping.
 *
 * @returns the Bridge API base URL for the current MetaMask environment
 */
export const getBridgeApiBaseUrlForMetaMaskEnv = (): string => {
  if (process.env.BRIDGE_USE_CUSTOM_BASE_URL) {
    return process.env.BRIDGE_USE_CUSTOM_BASE_URL;
  }

  switch (process.env.METAMASK_ENVIRONMENT) {
    case 'exp':
      return BRIDGE_UAT_API_BASE_URL;
    case 'dev':
    case 'test':
    case 'e2e':
    case 'local':
      return BRIDGE_DEV_API_BASE_URL;
    case 'production':
    case 'beta':
    case 'rc':
    case 'pre-release':
    default:
      return BRIDGE_PROD_API_BASE_URL;
  }
};

export const BRIDGE_API_BASE_URL = getBridgeApiBaseUrlForMetaMaskEnv();

export const BATCH_SELL_ENABLED = process.env.MM_BATCH_SELL_ENABLED === 'true';

export const BRIDGE_QUOTE_RESPONSE_MIGRATION_PHASE =
  (process.env
    .BRIDGE_QUOTE_RESPONSE_MIGRATION_PHASE as QuoteMetadataMigrationPhase) ??
  QuoteMetadataMigrationPhase.V2WithV1Fallback;
