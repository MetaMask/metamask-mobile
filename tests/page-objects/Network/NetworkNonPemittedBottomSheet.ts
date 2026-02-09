import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  NetworkNonPemittedBottomSheetSelectorsIDs,
  NetworkNonPemittedBottomSheetSelectorsText,
} from '../../../app/components/Views/NetworkConnect/NetworkNonPemittedBottomSheet.testIds';

class NetworkNonPemittedBottomSheet {
  get addThisNetworkTitle(): DetoxElement {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.ADD_THIS_NETWORK_TITLE,
    );
  }

  get sepoliaNetworkName(): DetoxElement {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.SEPOLIA_NETWORK_NAME,
    );
  }

  get ethereumMainNetNetworkName(): DetoxElement {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.ETHEREUM_MAIN_NET_NETWORK_NAME,
    );
  }

  get addThisNetworkButton(): DetoxElement {
    return Matchers.getElementByID(
      NetworkNonPemittedBottomSheetSelectorsIDs.ADD_THIS_NETWORK_BUTTON,
    );
  }

  get lineaSepoliaNetworkName(): DetoxElement {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.LINEA_SEPOLIA_NETWORK_NAME,
    );
  }

  get elysiumTestnetNetworkName(): DetoxElement {
    return Matchers.getElementByText(
      NetworkNonPemittedBottomSheetSelectorsText.ELYSIUM_TESTNET_NETWORK_NAME,
    );
  }

  get chooseFromPermittedNetworksButton(): DetoxElement {
    return Matchers.getElementByID(
      NetworkNonPemittedBottomSheetSelectorsIDs.CHOOSE_FROM_PERMITTED_NETWORKS_BUTTON,
    );
  }

  get editPermissionsButton(): DetoxElement {
    return Matchers.getElementByID(
      NetworkNonPemittedBottomSheetSelectorsIDs.EDIT_PERMISSIONS_BUTTON,
    );
  }

  async tapAddThisNetworkButton(): Promise<void> {
    await Gestures.waitAndTap(this.addThisNetworkButton, {
      elemDescription: 'Add this network button',
    });
  }

  async tapSepoliaNetworkName(): Promise<void> {
    await Gestures.waitAndTap(this.sepoliaNetworkName, {
      elemDescription: 'Sepolia network name',
    });
  }

  async tapEthereumMainNetNetworkName(): Promise<void> {
    await Gestures.waitAndTap(this.ethereumMainNetNetworkName, {
      elemDescription: 'Ethereum main net network name',
    });
  }

  async tapLineaSepoliaNetworkName(): Promise<void> {
    await Gestures.waitAndTap(this.lineaSepoliaNetworkName, {
      elemDescription: 'Linea Sepolia network name',
    });
  }

  async tapElysiumTestnetNetworkName(): Promise<void> {
    await Gestures.waitAndTap(this.elysiumTestnetNetworkName, {
      elemDescription: 'Elysium testnet network name',
    });
  }

  async tapChooseFromPermittedNetworksButton(): Promise<void> {
    await Gestures.waitAndTap(this.chooseFromPermittedNetworksButton, {
      elemDescription: 'Choose from permitted networks button',
    });
  }

  async tapEditPermissionsButton(): Promise<void> {
    await Gestures.waitAndTap(this.editPermissionsButton, {
      elemDescription: 'Edit permissions button',
    });
  }
}

export default new NetworkNonPemittedBottomSheet();
