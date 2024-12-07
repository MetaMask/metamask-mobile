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

  async tapAddThisNetworkButton() {
    await Gestures.waitAndTap(this.addThisNetworkButton);
  }

  async tapSepoliaNetworkName() {
    await Gestures.waitAndTap(this.sepoliaNetworkName);
  }

  async tapEthereumMainNetNetworkName() {
    await Gestures.waitAndTap(this.ethereumMainNetNetworkName);
  }
}

export default new NetworkNonPemittedBottomSheet();
