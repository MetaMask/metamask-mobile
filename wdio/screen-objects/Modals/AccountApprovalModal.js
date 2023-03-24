import Selectors from '../../helpers/Selectors';
import { ACCOUNT_APPROVAL_CONNECT_BUTTON } from '../testIDs/Components/AccountApprovalModal.testIds';
import Gestures from '../../helpers/Gestures';

class AccountApprovalModal {
  get connectButton() {
    return Selectors.getElementByPlatform(ACCOUNT_APPROVAL_CONNECT_BUTTON);
  }

  async tapConnectButton() {
    await Gestures.waitAndTap(this.connectButton);
  }
}

export default new AccountApprovalModal();
