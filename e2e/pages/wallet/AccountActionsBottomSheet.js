import { AccountActionsBottomSheetSelectorsIDs } from '../../selectors/wallet/AccountActionsBottomSheet.selectors.js';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { EditAccountNameSelectorIDs } from '../../selectors/wallet/EditAccountName.selectors.js';
import TestHelpers from '../../helpers.js';
import EditAccountNameView from './EditAccountNameView.js';

class AccountActionsBottomSheet {
  get editAccount() {
    return Matchers.getElementByID(
      AccountActionsBottomSheetSelectorsIDs.EDIT_ACCOUNT,
    );
  }

  get showPrivateKey() {
    return Matchers.getElementByID(
      AccountActionsBottomSheetSelectorsIDs.SHOW_PRIVATE_KEY,
    );
  }

  get showSrp() {
    return Matchers.getElementByID(
      AccountActionsBottomSheetSelectorsIDs.SHOW_SECRET_RECOVERY_PHRASE,
    );
  }

  async tapEditAccount() {
    await Gestures.waitAndTap(this.editAccount);
  }

  async tapShowPrivateKey() {
    await Gestures.waitAndTap(this.showPrivateKey);
  }

  async tapShowSRP() {
    await Gestures.waitAndTap(this.showSrp);
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

export default new AccountActionsBottomSheet();
