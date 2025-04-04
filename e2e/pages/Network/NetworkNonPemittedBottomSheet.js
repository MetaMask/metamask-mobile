import {
  NetworkListModalSelectorsIDs,
  NetworkListModalSelectorsText,
} from '../../selectors/Network/NetworkListModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  NetworkNonPemittedBottomSheetSelectorsIDs,
  NetworkNonPemittedBottomSheetSelectorsText,
} from '../../selectors/Network/NetworkNonPemittedBottomSheet.selectors';
import TestHelpers from '../../helpers';

class NetworkNonPemittedBottomSheet {
  get addThisNetworkTitle() {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.ADD_THIS_NETWORK_TITLE,
    );
  }

  get sepoliaNetworkName() {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.SEPOLIA_NETWORK_NAME,
    );
  }

  get ethereumMainNetNetworkName() {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
    );
  }

  get addThisNetworkButton() {
    return Matchers.getElementByID(
      NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON,
    );
  }

  get lineaSepoliaNetworkName() {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.LINEA_SEPOLIA_NETWORK_NAME,
    );
  }

  get elysiumTestnetNetworkName() {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.ELYSIUM_TESTNET_NETWORK_NAME,
    );
  }

  get chooseFromPermittedNetworksButton() {
    return Matchers.getElementByID(
      NetworkNonPemittedBottomSheetSelectorsIDs.CHOOSE_FROM_PERMITTED_NETWORKS_BUTTON,
    );
  }

  get editPermissionsButton() {
    return Matchers.getElementByID(
      NetworkNonPemittedBottomSheetSelectorsIDs.EDIT_PERMISSIONS_BUTTON,
    );
  }

  async tapAddThisNetworkButton() {
    await Gestures.waitAndTap(this.addThisNetworkButton);
  }

  async tapSepoliaNetworkName() {
    await Gestures.waitAndTap(this.sepoliaNetworkName);
  }

  async tapEthereumMainNetNetworkName() {
    await Gestures.waitAndTap(this.ethereumMainNetNetworkName);
  }

  async tapLineaSepoliaNetworkName() {
    await Gestures.waitAndTap(this.lineaSepoliaNetworkName);
  }

  async tapElysiumTestnetNetworkName() {
    await Gestures.waitAndTap(this.elysiumTestnetNetworkName);
  }

  async tapChooseFromPermittedNetworksButton() {
    await Gestures.waitAndTap(this.chooseFromPermittedNetworksButton);
  }

  async tapEditPermissionsButton() {
    await Gestures.waitAndTap(this.editPermissionsButton);
  }
}

export default new NetworkNonPemittedBottomSheet();
