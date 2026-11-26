import { CHAIN_IDS } from '@metamask/transaction-controller';

export const MAIN_CHAIN_IDS = new Set([
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
  CHAIN_IDS.MONAD,
  CHAIN_IDS.POLYGON,
  CHAIN_IDS.ARBITRUM,
] as string[]);

export const ADDITIONAL_NETWORK_SECTION_ID =
  'additional-network-section' as const;

export const SELECT_ALL_NETWORKS_SECTION_ID =
  'select-all-networks-section' as const;
