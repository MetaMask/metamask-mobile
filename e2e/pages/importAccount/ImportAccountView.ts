import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { ImportAccountFromPrivateKeyIDs } from '../../selectors/ImportAccount/ImportAccountFromPrivateKey.selectors';

class ImportAccountView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ImportAccountFromPrivateKeyIDs.CONTAINER);
  }

  get importButton(): DetoxElement {
    return Matchers.getElementByID(
      ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON,
    );
  }

  get privateKeyField(): DetoxElement {
    return Matchers.getElementByID(
      ImportAccountFromPrivateKeyIDs.PRIVATE_KEY_INPUT_BOX,
    );
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(ImportAccountFromPrivateKeyIDs.CLOSE_BUTTON);
  }

  async tapImportButton(): Promise<void> {
    await Gestures.waitAndTap(this.importButton, {
      elemDescription: 'Import Button',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button',
    });
  }

  async enterPrivateKey(privateKey: string): Promise<void> {
    await Gestures.typeText(this.privateKeyField, privateKey, {
      elemDescription: 'Private key input field',
      hideKeyboard: true,
    });
  }
}

export default new ImportAccountView();
