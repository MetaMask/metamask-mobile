import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import {
  APPROVE_NETWORK_APPROVE_BUTTON,
  APPROVE_NETWORK_MODAL,
  NEW_NETWORK_ADDED_CLOSE_BUTTON,
  NEW_NETWORK_ADDED_SWITCH_TO_NETWORK_BUTTON,
} from '../testIDs/Screens/NetworksScreen.testids';

class NetworkApprovalModal {
  get ApproveNetworkModal() {
    return Selectors.getElementByPlatform(APPROVE_NETWORK_MODAL);
  }

  get ApproveNetworkApproveButton() {
    return Selectors.getElementByPlatform(APPROVE_NETWORK_APPROVE_BUTTON);
  }

  get closeNetworkButton() {
    return Selectors.getElementByPlatform(NEW_NETWORK_ADDED_CLOSE_BUTTON);
  }

  get SwitchToNetworkButton() {
    return Selectors.getElementByPlatform(
      NEW_NETWORK_ADDED_SWITCH_TO_NETWORK_BUTTON,
    );
  }

  async isApproveNetworkModal() {
    const element = await this.ApproveNetworkModal;
    await element.waitForDisplayed();
  }

  async isApproveNetworkButton() {
    const element = await this.ApproveNetworkApproveButton;
    await element.waitForDisplayed();
  }

  async isCloseNetworkButton() {
    const element = await this.closeNetworkButton;
    await element.waitForDisplayed();
  }

  async tapApproveButton() {
    await Gestures.waitAndTap(this.ApproveNetworkApproveButton);
  }

  async tapSwitchToNetwork() {
    await Gestures.waitAndTap(this.SwitchToNetworkButton);
  }

  async isSwitchToNetworkButtonDisplayed() {
    const element = await this.SwitchToNetworkButton;
    await element.waitForDisplayed();
  }
}

export default new NetworkApprovalModal();
