import { CaipChainId, SolScope } from '@metamask/keyring-api';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

export const CHAIN_ID_TO_SHORT_NAME_MAP: Record<
  Hex | CaipChainId,
  string
> = {
  [CHAIN_IDS.MAINNET]: 'Ethereum',
  [CHAIN_IDS.LINEA_MAINNET]: 'Linea',
  [CHAIN_IDS.POLYGON]: 'Polygon',
  [CHAIN_IDS.AVALANCHE]: 'Avalanche',
  [CHAIN_IDS.BSC]: 'Binance Smart Chain',
  [CHAIN_IDS.ARBITRUM]: 'Arbitrum One',
  [CHAIN_IDS.OPTIMISM]: 'OP Mainnet',
  [CHAIN_IDS.ZKSYNC_ERA]: 'ZkSync Era',
  [CHAIN_IDS.BASE]: 'Base',

  [toEvmCaipChainId(CHAIN_IDS.MAINNET)]: 'Ethereum',
  [toEvmCaipChainId(CHAIN_IDS.LINEA_MAINNET)]: 'Linea',
  [toEvmCaipChainId(CHAIN_IDS.POLYGON)]: 'Polygon',
  [toEvmCaipChainId(CHAIN_IDS.AVALANCHE)]: 'Avalanche',
  [toEvmCaipChainId(CHAIN_IDS.BSC)]: 'Binance Smart Chain',
  [toEvmCaipChainId(CHAIN_IDS.ARBITRUM)]: 'Arbitrum One',
  [toEvmCaipChainId(CHAIN_IDS.OPTIMISM)]: 'OP Mainnet',
  [toEvmCaipChainId(CHAIN_IDS.ZKSYNC_ERA)]: 'ZkSync Era',
  [toEvmCaipChainId(CHAIN_IDS.BASE)]: 'Base',
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  [SolScope.Mainnet]: 'Solana',
  ///: END:ONLY_INCLUDE_IF
};
