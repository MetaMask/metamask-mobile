import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';
import { ImportAccountFromPrivateKeyIDs } from '../../../app/components/Views/ImportPrivateKey/ImportAccountFromPrivateKey.testIds';
import { PlatformDetector } from '../../framework';

class ImportAccountView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(ImportAccountFromPrivateKeyIDs.CONTAINER);
  }

  get importButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON,
    );
  }

  get privateKeyField(): Promise<AppiumElement> {
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
      // Multiline input: fill/setValue is unreliable; per-char addValue + Return
      // submits via goNext() (tapOutside cannot dismiss this keyboard).
      await Gestures.typeTextByCharacters(this.privateKeyField, privateKey, {
        submitWithReturn: true,
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
