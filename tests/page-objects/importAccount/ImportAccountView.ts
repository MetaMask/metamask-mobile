import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { ImportAccountFromPrivateKeyIDs } from '../../../app/components/Views/ImportPrivateKey/ImportAccountFromPrivateKey.testIds';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
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
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(this.privateKeyField, privateKey, {
          elemDescription: 'Private key input field',
          hideKeyboard: true,
        });
      },
      appium: async () => {
        await Gestures.typeText(this.privateKeyField, privateKey, {
          elemDescription: 'Private key input field',
          hideKeyboard: false,
        });
        if (PlatformDetector.isIOS()) {
          await PlaywrightGestures.tapKeyboardReturnKey('Next');
        } else {
          await Gestures.waitAndTap(this.importButton, {
            elemDescription: 'Import Button',
          });
        }
      },
    });
  }
}

export default new ImportAccountView();
