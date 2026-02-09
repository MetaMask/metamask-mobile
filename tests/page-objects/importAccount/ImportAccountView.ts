import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { ImportAccountFromPrivateKeyIDs } from '../../../app/components/Views/ImportPrivateKey/ImportAccountFromPrivateKey.testIds.ts';

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

  async tapImportButton(): Promise<void> {
    await Gestures.waitAndTap(this.importButton, {
      elemDescription: 'Import Button',
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
