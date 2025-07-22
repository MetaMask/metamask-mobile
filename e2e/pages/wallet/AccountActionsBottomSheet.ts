import { AccountActionsBottomSheetSelectorsIDs } from '../../selectors/wallet/AccountActionsBottomSheet.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import EditAccountNameView from './EditAccountNameView';

class AccountActionsBottomSheet {
  get editAccount(): DetoxElement {
    return Matchers.getElementByID(
      AccountActionsBottomSheetSelectorsIDs.EDIT_ACCOUNT,
    );
  }

  get showPrivateKey(): DetoxElement {
    return Matchers.getElementByID(
      AccountActionsBottomSheetSelectorsIDs.SHOW_PRIVATE_KEY,
    );
  }

  get showSrp(): DetoxElement {
    return Matchers.getElementByID(
      AccountActionsBottomSheetSelectorsIDs.SHOW_SECRET_RECOVERY_PHRASE,
    );
  }

  async tapEditAccount(): Promise<void> {
    await Gestures.waitAndTap(this.editAccount, {
      elemDescription: 'Edit account button',
    });
  }

  async tapShowPrivateKey(): Promise<void> {
    await Gestures.waitAndTap(this.showPrivateKey, {
      elemDescription: 'Show private key button',
    });
  }

  async tapShowSRP(): Promise<void> {
    await Gestures.waitAndTap(this.showSrp, {
      elemDescription: 'Show secret recovery phrase button',
    });
  }

  async renameActiveAccount(newName: string): Promise<void> {
    await this.tapEditAccount();
    await Gestures.typeText(EditAccountNameView.accountNameInput, newName, {
      hideKeyboard: true,
      clearFirst: true,
    });
    await EditAccountNameView.tapSave();
  }
}

export default new AccountActionsBottomSheet();
