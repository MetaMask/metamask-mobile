import { AccountActionsModalSelectorsIDs } from '../../selectors/Modals/AccountActionsModal.selectors.js';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import EditAccountNameSelectorIDs from '../../selectors/EditAccountName.selectors.js';
import TestHelpers from '../../helpers.js';
import EditAccountNameView from '../EditAccountNameView.js';

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

  async renameActiveAccount(newName) {
    await this.tapEditAccount();
    await Gestures.clearField(EditAccountNameView.accountNameInput);
    await TestHelpers.typeTextAndHideKeyboard(
      EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT,
      newName,
    );
    await EditAccountNameView.tapSave();
  }
}

export default new AccountActionsModal();
