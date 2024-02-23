import {
  NetworkAddedModalSelectorsIDs,
  NetworkAddedModalSelectorsText,
} from '../../selectors/Modals/NetworkAddedModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class NetworkAddedModal {
  get switchNetwork() {
    return Matchers.getElementByText(
      NetworkAddedModalSelectorsText.SWITCH_NETWORK,
    );
  }

  get switchNetworkButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(
          NetworkAddedModalSelectorsIDs.SWITCH_NETWORK_BUTTON,
        )
      : Matchers.getElementByID(
          NetworkAddedModalSelectorsIDs.SWITCH_NETWORK_BUTTON,
        );
  }

  get closeNetworkButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(
          NetworkAddedModalSelectorsIDs.CLOSE_NETWORK_BUTTON,
        )
      : Matchers.getElementByID(
          NetworkAddedModalSelectorsIDs.CLOSE_NETWORK_BUTTON,
        );
  }

  async tapSwitchToNetwork() {
    await Gestures.waitAndTap(this.switchNetworkButton);
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeNetworkButton);
  }
}

export default new NetworkAddedModal();
