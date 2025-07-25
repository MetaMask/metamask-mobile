import { AccountActionsBottomSheetSelectorsIDs } from '../../selectors/wallet/AccountActionsBottomSheet.selectors.js';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
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
    await Gestures.typeTextAndHideKeyboard(
      EditAccountNameView.accountNameInput,
      newName,
    );
    await EditAccountNameView.tapSave();
  }
}

export default new AccountActionsBottomSheet();
