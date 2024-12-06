import enContent from '../../../locales/languages/en.json';
import { CustomNetworks } from '../../resources/networks.e2e';

export const NetworkNonPemittedBottomSheetSelectorsText = {
  ADD_THIS_NETWORK_TITLE: enContent.permissions.title_add_network_permission,
  SEPOLIA_NETWORK_NAME: CustomNetworks.Sepolia.providerConfig.nickname,
  ETHEREUM_MAIN_NET_NETWORK_NAME: 'Ethereum Main Network',
};

export const NetworkNonPemittedBottomSheetSelectorsIDs = {
  ADD_THIS_NETWORK_BUTTON: 'add-this-network-button',
};
