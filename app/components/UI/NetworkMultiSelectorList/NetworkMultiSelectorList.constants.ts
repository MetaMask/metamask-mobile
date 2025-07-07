import { CHAIN_IDS } from '@metamask/transaction-controller';

export const MAIN_CHAIN_IDS = new Set([
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
] as string[]);

export const ESTIMATED_ITEM_SIZE = 56;
export const DEVICE_HEIGHT_MULTIPLIER = 0.05;

export const ADDITIONAL_NETWORK_SECTION_ID =
  'additional-network-section' as const;

export const ITEM_TYPE_ADDITIONAL_SECTION = 'additional-section' as const;
export const ITEM_TYPE_NETWORK = 'network' as const;
