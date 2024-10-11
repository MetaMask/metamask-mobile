import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';
import EditAccountNameSelectorIDs from '../selectors/EditAccountName.selectors';

export default class EditAccountNameView {
  static async saveButton() {
    return await Matchers.getElementByID(
      EditAccountNameSelectorIDs.EDIT_ACCOUNT_NAME_SAVE,
    );
  }

  static async tapSave() {
    await Gestures.waitAndTap(this.saveButton());
  }

  static async accountNameInput() {
    return await Matchers.getElementByID(
      EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT,
    );
  }
}
