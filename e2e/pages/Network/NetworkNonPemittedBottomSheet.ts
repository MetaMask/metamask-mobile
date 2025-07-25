import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  NetworkNonPemittedBottomSheetSelectorsIDs,
  NetworkNonPemittedBottomSheetSelectorsText,
} from '../../selectors/Network/NetworkNonPemittedBottomSheet.selectors';

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
      elemDescription:
        'Add This Network Button in Network Non-Permitted Bottom Sheet',
    });
  }

  async tapSepoliaNetworkName(): Promise<void> {
    await Gestures.waitAndTap(this.sepoliaNetworkName, {
      elemDescription:
        'Sepolia Network Name in Network Non-Permitted Bottom Sheet',
    });
  }

  async tapEthereumMainNetNetworkName(): Promise<void> {
    await Gestures.waitAndTap(this.ethereumMainNetNetworkName, {
      elemDescription:
        'Ethereum Main Net Network Name in Network Non-Permitted Bottom Sheet',
    });
  }

  async tapLineaSepoliaNetworkName(): Promise<void> {
    await Gestures.waitAndTap(this.lineaSepoliaNetworkName, {
      elemDescription:
        'Linea Sepolia Network Name in Network Non-Permitted Bottom Sheet',
    });
  }

  async tapElysiumTestnetNetworkName(): Promise<void> {
    await Gestures.waitAndTap(this.elysiumTestnetNetworkName, {
      elemDescription:
        'Elysium Testnet Network Name in Network Non-Permitted Bottom Sheet',
    });
  }

  async tapChooseFromPermittedNetworksButton(): Promise<void> {
    await Gestures.waitAndTap(this.chooseFromPermittedNetworksButton, {
      elemDescription:
        'Choose From Permitted Networks Button in Network Non-Permitted Bottom Sheet',
    });
  }

  async tapEditPermissionsButton(): Promise<void> {
    await Gestures.waitAndTap(this.editPermissionsButton, {
      elemDescription:
        'Edit Permissions Button in Network Non-Permitted Bottom Sheet',
    });
  }
}

export default new NetworkNonPemittedBottomSheet();
