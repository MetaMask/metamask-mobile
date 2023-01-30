import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';
import {
  NEW_NETWORK_ADDED_SWITCH_TO_NETWORK_BUTTON,
  NEW_NETWORK_ADDED_CLOSE_BUTTON,
  APPROVE_NETWORK_APPROVE_BUTTON,
  APPROVE_NETWORK_MODAL,
} from '../testIDs/Screens/NetworksScreen.testids';

class NetworkApprovalModal {
  get ApproveNetworkModal() {
    return Selectors.getElementByPlatform(APPROVE_NETWORK_MODAL);
  }

  get ApproveNetworkApproveButton() {
    return Selectors.getElementByPlatform(APPROVE_NETWORK_APPROVE_BUTTON);
  }
  get CloseNetworkButton() {
    return Selectors.getElementByPlatform(NEW_NETWORK_ADDED_CLOSE_BUTTON);
  }

  get SwitchToNetworkButton() {
    return Selectors.getElementByPlatform(
      NEW_NETWORK_ADDED_SWITCH_TO_NETWORK_BUTTON,
    );
  }

  async isApproveNetworkModal() {
    await expect(this.ApproveNetworkModal).toBeDisplayed();
  }

  async isApproveNetworkButton() {
    await expect(this.ApproveNetworkApproveButton).toBeDisplayed();
  }

  async isCloseNetworkButton() {
    await expect(this.CloseNetworkButton).toBeDisplayed();
  }

  async tapApproveButton() {
    await Gestures.tap(this.ApproveNetworkApproveButton);
  }

  async tapSwitchToNetwork() {
    await Gestures.tap(this.SwitchToNetworkButton);
  }
}
export default new NetworkApprovalModal();
