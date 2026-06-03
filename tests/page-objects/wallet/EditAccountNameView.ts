import Matchers from '../../framework/Matchers';
import { EditAccountNameSelectorIDs } from '../../../app/components/Views/EditAccountName/EditAccountName.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class EditAccountNameView {
  get saveButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          EditAccountNameSelectorIDs.EDIT_ACCOUNT_NAME_SAVE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EditAccountNameSelectorIDs.EDIT_ACCOUNT_NAME_SAVE,
        ),
    });
  }
  get accountNameInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT,
        ),
    });
  }

  async tapSave(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.saveButton, {
      elemDescription: 'Save button',
    });
  }

  async updateAccountName(accountName: string): Promise<void> {
    await UnifiedGestures.typeText(this.accountNameInput, accountName, {
      hideKeyboard: true,
      clearFirst: true,
      elemDescription: 'Account name input',
    });
  }
}

export default new EditAccountNameView();
