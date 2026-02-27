/**
 * Mapping between hex chainId and Blockaid API chain names.
 * The Blockaid approvals API expects chain names, not hex IDs.
 */
export const CHAIN_ID_TO_BLOCKAID_NAME: Record<string, string> = {
  '0x1': 'ethereum',
  '0x89': 'polygon',
  '0x38': 'bsc',
  '0xa86a': 'avalanche',
  '0xa4b1': 'arbitrum',
  '0x2105': 'base',
  '0xe708': 'linea',
  '0xa': 'optimism',
};

export const BLOCKAID_NAME_TO_CHAIN_ID: Record<string, string> = Object.entries(
  CHAIN_ID_TO_BLOCKAID_NAME,
).reduce(
  (acc, [chainId, name]) => {
    acc[name] = chainId;
    return acc;
  },
  {} as Record<string, string>,
);

export const SUPPORTED_CHAIN_IDS = Object.keys(CHAIN_ID_TO_BLOCKAID_NAME);

export const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  '0x1': 'Ethereum',
  '0x89': 'Polygon',
  '0x38': 'BNB Chain',
  '0xa86a': 'Avalanche',
  '0xa4b1': 'Arbitrum',
  '0x2105': 'Base',
  '0xe708': 'Linea',
  '0xa': 'Optimism',
};
