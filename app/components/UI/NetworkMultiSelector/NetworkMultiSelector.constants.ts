export const NETWORK_MULTI_SELECTOR_TEST_IDS = {
  // Containers
  NETWORK_MANAGER_BOTTOM_SHEET: 'network-manager-bottom-sheet',
  POPULAR_NETWORKS_CONTAINER: 'popular-networks-selector-container',
  CUSTOM_NETWORKS_CONTAINER: 'custom-networks-selector-container',
  CUSTOM_NETWORK_CONTAINER: 'network-multi-selector-custom-network-container',

  // Buttons
  SELECT_ALL_POPULAR_NETWORKS_SELECTED:
    'network-multi-selector-select-all-popular-networks-selected',
  SELECT_ALL_POPULAR_NETWORKS_NOT_SELECTED:
    'network-multi-selector-select-all-popular-networks-not-selected',
  OPEN_NETWORK_MANAGER: 'open-network-manager',

  // Tabs
  POPULAR_NETWORKS_TAB: 'popular-networks-tab',
  CUSTOM_NETWORKS_TAB: 'custom-networks-tab',

  // List Item
  NETWORK_LIST_ITEM: (caipChainId: string, isSelected: boolean) =>
    `network-list-item-${caipChainId}-${
      isSelected ? 'selected' : 'not-selected'
    }`,
} as const;

export enum NetworkToCaipChainId {
  SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  ETHEREUM = 'eip155:1',
  LINEA = 'eip155:59144',
  AVALANCHE = 'eip155:43114',
  BNB = 'eip155:56',
  ZKSYNC_ERA = 'eip155:324',
  BASE = 'eip155:8453',
  OPTIMISM = 'eip155:10',
  POLYGON = 'eip155:137',
  PALM = 'eip155:11297108109',
  ARBITRUM = 'eip155:42161',
  LOCALHOST = 'eip155:1337',
  ETHEREUM_SEPOLIA = 'eip155:11155111',
  LINEA_SEPOLIA = 'eip155:59141',
}
