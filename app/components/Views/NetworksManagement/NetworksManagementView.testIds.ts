export const NetworksManagementViewSelectorsIDs = {
  CONTAINER: 'networks-settings-container',
  SEARCH_INPUT: 'networks-settings-search-input',
  SECTION_LIST: 'networks-settings-section-list',
  ADDED_MAINNETS_SECTION: 'networks-settings-added-mainnets-section',
  ADDED_TESTNETS_SECTION: 'networks-settings-added-testnets-section',
  AVAILABLE_NETWORKS_SECTION: 'networks-settings-available-networks-section',
  ADD_CUSTOM_NETWORK_BUTTON: 'networks-settings-add-custom-network-button',
  NETWORK_ITEM: (chainId: string) =>
    `networks-settings-network-item-${chainId}`,
  NETWORK_MENU_BUTTON: (chainId: string) =>
    `networks-settings-menu-button-${chainId}`,
  DELETE_MODAL: 'networks-settings-delete-modal',
  DELETE_CONFIRM_BUTTON: 'networks-settings-delete-confirm-button',
  DELETE_CANCEL_BUTTON: 'networks-settings-delete-cancel-button',
  EMPTY_STATE: 'networks-settings-empty-state',
};
