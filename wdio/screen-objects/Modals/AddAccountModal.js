import Selectors from '../../helpers/Selectors';
import {
  ADD_ACCOUNT_IMPORT_ACCOUNT_BUTTON,
  ADD_ACCOUNT_NEW_ACCOUNT_BUTTON,
} from '../testIDs/Components/AddAccountModal.testIds';
import Gestures from '../../helpers/Gestures';

class AddAccountModal {
  get newAccountButton() {
    return Selectors.getElementByPlatform(ADD_ACCOUNT_NEW_ACCOUNT_BUTTON);
  }

  get importAccountButton() {
    return Selectors.getElementByPlatform(ADD_ACCOUNT_IMPORT_ACCOUNT_BUTTON);
  }

  async tapNewAccountButton() {
    await Gestures.waitAndTap(this.newAccountButton);
    const newAccountButton = await this.newAccountButton;
    await newAccountButton.waitForExist({ reverse: true });
  }

  async tapImportAccountButton() {
    await Gestures.waitAndTap(this.importAccountButton);
  }
}

export default new AddAccountModal();
