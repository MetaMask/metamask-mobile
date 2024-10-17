import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';
import EditAccountNameSelectorIDs from '../selectors/EditAccountName.selectors';

class EditAccountNameView {
  get saveButton() {
    return Matchers.getElementByID(EditAccountNameSelectorIDs.EDIT_ACCOUNT_NAME_SAVE);
  }

  async tapSave() {
    await Gestures.waitAndTap(this.saveButton);
  }

  get accountNameInput() {
    return Matchers.getElementByID(EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT);
  }

  async typeAccountName(name) {
    await Gestures.typeText(this.accountNameInput, name);
  }
}

export default new EditAccountNameView();
