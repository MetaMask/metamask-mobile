import Matchers from '../../../../utils/Matchers';
import Gestures from '../../../../utils/Gestures';
import { DeleteAccountModalSelectorsText } from '../../../../selectors/Settings/Contacts/DeleteAccountModal.selectors';

class DeleteAccountModal {
  get deleteButton() {
    return Matchers.getElementByText(
      DeleteAccountModalSelectorsText.DELETE_BUTTON,
    );
  }
  get labelDeleteButton() {
    return Matchers.getElementByLabel(
      DeleteAccountModalSelectorsText.DELETE_BUTTON,
    );
  }

  async tapDeleteButton() {
    await Gestures.waitAndTap(this.deleteButton);
  }

  async tapLabelDeleteButton() {
    await Gestures.waitAndTap(this.labelDeleteButton);
  }
}

export default new DeleteAccountModal();
