import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EditAccountNameSelectorIDs } from '../../../app/components/Views/EditAccountName/EditAccountName.testIds';

class EditAccountNameView {
  get saveButton(): DetoxElement {
    return Matchers.getElementByID(
      EditAccountNameSelectorIDs.EDIT_ACCOUNT_NAME_SAVE,
    );
  }
  get accountNameInput(): DetoxElement {
    return Matchers.getElementByID(
      EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT,
    );
  }

  async tapSave(): Promise<void> {
    await Gestures.waitAndTap(this.saveButton, {
      elemDescription: 'Save button',
    });
  }

  async updateAccountName(accountName: string): Promise<void> {
    await Gestures.typeText(this.accountNameInput, accountName, {
      hideKeyboard: true,
      clearFirst: true,
      elemDescription: 'Account name input',
    });
  }
}

export default new EditAccountNameView();
