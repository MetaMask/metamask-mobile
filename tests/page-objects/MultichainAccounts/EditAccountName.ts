import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EditAccountNameIds } from '../../../app/components/Views/MultichainAccounts/sheets/EditAccountName.testIds';
import { type AppiumElement } from '../../framework';

class EditAccountName {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER,
    );
  }

  get accountNameInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(EditAccountNameIds.ACCOUNT_NAME_INPUT);
  }

  get saveButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(EditAccountNameIds.SAVE_BUTTON);
  }

  async updateAccountName(newName: string): Promise<void> {
    await Gestures.typeText(this.accountNameInput, newName, {
      elemDescription: 'Account Name Input in Edit Account Name',
      hideKeyboard: true,
    });
  }

  async tapSave(): Promise<void> {
    await Gestures.waitAndTap(this.saveButton, {
      elemDescription: 'Save Button in Edit Account Name',
    });
  }
}

export default new EditAccountName();
