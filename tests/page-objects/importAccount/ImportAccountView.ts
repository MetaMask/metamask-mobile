import Matchers from '../../framework/Matchers';
import { ImportAccountFromPrivateKeyIDs } from '../../../app/components/Views/ImportPrivateKey/ImportAccountFromPrivateKey.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class ImportAccountView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ImportAccountFromPrivateKeyIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportAccountFromPrivateKeyIDs.CONTAINER,
        ),
    });
  }

  get importButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON,
        ),
    });
  }

  get privateKeyField(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ImportAccountFromPrivateKeyIDs.PRIVATE_KEY_INPUT_BOX,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportAccountFromPrivateKeyIDs.PRIVATE_KEY_INPUT_BOX,
        ),
    });
  }

  async tapImportButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.importButton, {
      elemDescription: 'Import Button',
    });
  }

  async enterPrivateKey(privateKey: string): Promise<void> {
    await UnifiedGestures.typeText(this.privateKeyField, privateKey, {
      elemDescription: 'Private key input field',
      hideKeyboard: true,
    });
  }
}

export default new ImportAccountView();
