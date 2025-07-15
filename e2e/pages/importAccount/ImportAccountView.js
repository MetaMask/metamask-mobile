import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { ImportAccountFromPrivateKeyIDs } from '../../selectors/ImportAccount/ImportAccountFromPrivateKey.selectors';

class ImportAccountView {
  get container() {
    return Matchers.getElementByID(ImportAccountFromPrivateKeyIDs.CONTAINER);
  }

  get importButton() {
    return Matchers.getElementByID(
      ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON,
    );
  }

  get privateKeyField() {
    return Matchers.getElementByID(
      ImportAccountFromPrivateKeyIDs.PRIVATE_KEY_INPUT_BOX,
    );
  }

  async tapImportButton() {
    await Gestures.waitAndTap(this.importButton);
  }

  async enterPrivateKey(privateKey) {
    await Gestures.typeTextAndHideKeyboard(this.privateKeyField, privateKey);
  }
}

export default new ImportAccountView();
