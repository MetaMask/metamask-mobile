import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { EditAccountNameIds } from '../../selectors/MultichainAccounts/EditAccountName.selectors';

class EditAccountName {
  get container() {
    return Matchers.getElementByID(
      EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER,
    );
  }

  get accountNameInput() {
    return Matchers.getElementByID(
      EditAccountNameIds.ACCOUNT_NAME_INPUT,
    ) as Promise<Detox.IndexableNativeElement>;
  }

  get saveButton() {
    return Matchers.getElementByID(EditAccountNameIds.SAVE_BUTTON);
  }

  async updateAccountName(newName: string) {
    await Gestures.clearField(this.accountNameInput);
    await Gestures.typeTextAndHideKeyboard(this.accountNameInput, newName);
  }

  async tapSave() {
    await Gestures.waitAndTap(this.saveButton);
  }
}

export default new EditAccountName();
