import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EditAccountNameSelectorIDs } from '../../../app/components/Views/EditAccountName/EditAccountName.testIds';
import { EncapsulatedElementType } from '../../framework';

class EditAccountNameView {
  get saveButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      EditAccountNameSelectorIDs.EDIT_ACCOUNT_NAME_SAVE,
    );
  }
  get accountNameInput(): EncapsulatedElementType {
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
