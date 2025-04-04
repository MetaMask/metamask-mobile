import enContent from '../../../locales/languages/en.json';
import { CustomNetworks } from '../../resources/networks.e2e';

export const NetworkNonPemittedBottomSheetSelectorsText = {
  ADD_THIS_NETWORK_TITLE: enContent.permissions.title_add_network_permission,
  SEPOLIA_NETWORK_NAME: CustomNetworks.Sepolia.providerConfig.nickname,
  ETHEREUM_MAIN_NET_NETWORK_NAME: 'Ethereum Main Network',
  LINEA_SEPOLIA_NETWORK_NAME: 'Linea Sepolia',
  ELYSIUM_TESTNET_NETWORK_NAME: 'Elysium Testnet',
};

export const NetworkNonPemittedBottomSheetSelectorsIDs = {
  ADD_THIS_NETWORK_BUTTON: 'add-this-network-button',
  CHOOSE_FROM_PERMITTED_NETWORKS_BUTTON:
    'choose-from-permitted-networks-button',
  EDIT_PERMISSIONS_BUTTON: 'edit-permissions-button',
};
