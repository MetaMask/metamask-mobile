import Matchers from '../../framework/Matchers';
import { EditAccountNameIds } from '../../../app/components/Views/MultichainAccounts/sheets/EditAccountName.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class EditAccountName {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EditAccountNameIds.EDIT_ACCOUNT_NAME_CONTAINER,
        ),
    });
  }

  get accountNameInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EditAccountNameIds.ACCOUNT_NAME_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EditAccountNameIds.ACCOUNT_NAME_INPUT,
        ),
    });
  }

  get saveButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(EditAccountNameIds.SAVE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(EditAccountNameIds.SAVE_BUTTON),
    });
  }

  async updateAccountName(newName: string): Promise<void> {
    await UnifiedGestures.typeText(this.accountNameInput, newName, {
      elemDescription: 'Account Name Input in Edit Account Name',
      hideKeyboard: true,
    });
  }

  async tapSave(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.saveButton, {
      elemDescription: 'Save Button in Edit Account Name',
    });
  }
}

export default new EditAccountName();
