import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { ImportAccountFromPrivateKeyIDs } from '../../../app/components/Views/ImportPrivateKey/ImportAccountFromPrivateKey.testIds';
import { PlatformDetector } from '../../framework';

class ImportAccountView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(ImportAccountFromPrivateKeyIDs.CONTAINER);
  }

  get importButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON,
    );
  }

  get privateKeyField(): EncapsulatedElementType {
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
    if (PlatformDetector.isIOS()) {
      // Multiline input blocks tapOutside keyboard dismiss; Return submits via goNext().
      await Gestures.typeText(this.privateKeyField, `${privateKey}\n`, {
        elemDescription: 'Private key input field',
        hideKeyboard: false,
        clearFirst: true,
      });
      return;
    }

    await Gestures.typeText(this.privateKeyField, privateKey, {
      elemDescription: 'Private key input field',
      hideKeyboard: false,
    });
    await Gestures.waitAndTap(this.importButton, {
      elemDescription: 'Import Button',
    });
  }
}

export default new ImportAccountView();
