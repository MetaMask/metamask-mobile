import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { EditAccountNameSelectorIDs } from '../../selectors/wallet/EditAccountName.selectors';

class EditAccountNameView {
  get saveButton() {
    return Matchers.getElementByID(
      EditAccountNameSelectorIDs.EDIT_ACCOUNT_NAME_SAVE,
    );
  }
  get accountNameInput() {
    return Matchers.getElementByID(
      EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT,
    );
  }

  async tapSave() {
    await Gestures.waitAndTap(this.saveButton);
  }

  async updateAccountName(accountName) {
    await Gestures.clearField(this.accountNameInput);
    await Gestures.typeTextAndHideKeyboard(this.accountNameInput, accountName);
  }
}

export default new EditAccountNameView();
