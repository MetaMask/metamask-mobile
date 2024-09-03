import { AddAccountModalSelectorsIDs } from '../../selectors/Modals/AddAccountModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class AddAccountModal {
  get importAccountButton() {
    return Matchers.getElementByID(
      AddAccountModalSelectorsIDs.IMPORT_ACCOUNT_BUTTON,
    );
  }
  get createAccountButton() {
    return Matchers.getElementByID(
      AddAccountModalSelectorsIDs.NEW_ACCOUNT_BUTTON,
    );
  }

  async tapImportAccount() {
    await Gestures.waitAndTap(this.importAccountButton);
  }
  async tapCreateAccount() {
    await Gestures.waitAndTap(this.createAccountButton);
  }
}

export default new AddAccountModal();
