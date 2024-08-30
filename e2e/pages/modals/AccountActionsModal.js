import { AccountActionsModalSelectorsIDs } from '../../selectors/Modals/AccountActionsModal.selectors.js';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class AccountActionsModal {
  get editAccount() {
    return Matchers.getElementByID(
      AccountActionsModalSelectorsIDs.EDIT_ACCOUNT,
    );
  }

  get showPrivateKey() {
    return Matchers.getElementByID(
      AccountActionsModalSelectorsIDs.SHOW_PRIVATE_KEY,
    );
  }

  async tapEditAccount() {
    await Gestures.waitAndTap(await this.editAccount);
  }

  async tapShowPrivateKey() {
    await Gestures.waitAndTap(await this.showPrivateKey);
  }
}

export default new AccountActionsModal();
