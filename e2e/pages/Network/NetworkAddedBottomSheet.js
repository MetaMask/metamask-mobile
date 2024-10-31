import {
  NetworkAddedBottomSheetSelectorsIDs,
  NetworkAddedBottomSheetSelectorsText,
} from '../../selectors/Network/NetworkAddedBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class NetworkAddedBottomSheet {
  get switchNetwork() {
    return Matchers.getElementByText(
      NetworkAddedBottomSheetSelectorsText.SWITCH_NETWORK,
    );
  }

  get switchNetworkButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(
        NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
        )
      : Matchers.getElementByID(
        NetworkAddedBottomSheetSelectorsIDs.SWITCH_NETWORK_BUTTON,
        );
  }

  get closeNetworkButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(
        NetworkAddedBottomSheetSelectorsIDs.CLOSE_NETWORK_BUTTON,
        )
      : Matchers.getElementByID(
        NetworkAddedBottomSheetSelectorsIDs.CLOSE_NETWORK_BUTTON,
        );
  }

  async tapSwitchToNetwork() {
    await Gestures.waitAndTap(this.switchNetworkButton);
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeNetworkButton);
  }
}

export default new NetworkAddedBottomSheet();
