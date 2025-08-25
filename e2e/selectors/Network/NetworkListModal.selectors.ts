import enContent from '../../../locales/languages/en.json';

export const NetworkListModalSelectorsText = {
  SELECT_NETWORK: enContent.networks.select_network,
  DELETE_NETWORK: enContent.app_settings.delete,
  ADD_POPULAR_NETWORK_BUTTON: enContent.networks.add,
};

export const NetworkListModalSelectorsIDs = {
  SCROLL: 'other-networks-scroll',
  TEST_NET_TOGGLE: 'test-network-switch-id',
  DELETE_NETWORK: 'delete-network-button',
  OTHER_LIST: 'other-network-name',
  ADD_BUTTON: 'add-network-button',
  TOOLTIP: 'popular-networks-information-tooltip',
  CUSTOM_NETWORK_CELL: (customNetwork: string) =>
    `network-cell-${customNetwork}`,
};
