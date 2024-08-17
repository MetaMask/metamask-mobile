import { AccountActionsModalSelectorsIDs } from '../../selectors/Modals/AccountActionsModal.selectors.js';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class AccountActionsModal {
  get editAccount() {
    return Matchers.getElementByID(
      AccountActionsModalSelectorsIDs.EDIT_ACCOUNT,
    );
  }

  async tapEditAccount() {
    await Gestures.waitAndTap(await this.editAccount);
  }
}

export default new AccountActionsModal();
