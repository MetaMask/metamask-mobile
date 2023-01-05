import Selectors from '../../helpers/Selectors';
import {
  ACCOUNT_APPROVAL_CANCEL_BUTTON,
  ACCOUNT_APPROVAL_CONNECT_BUTTON,
} from '../../testIDs/Components/AccountApprovalModal.testIds';
import Gestures from '../../helpers/Gestures';

class AccountApprovalModal {
  get connectButton() {
    return Selectors.getElementByPlatform(ACCOUNT_APPROVAL_CONNECT_BUTTON);
  }

  get cancelButton() {
    return Selectors.getElementByPlatform(ACCOUNT_APPROVAL_CANCEL_BUTTON);
  }

  async tapConnectButton() {
    await Gestures.waitAndTap(this.connectButton);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async isSwitchModalDisplay() {
    await expect(this.cancelButton).toBeDisplayed();
  }
}

export default new AccountApprovalModal();
