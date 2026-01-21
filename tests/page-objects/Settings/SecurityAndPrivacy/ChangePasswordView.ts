import { RESET_PASSWORD_CONFIRM_INPUT_BOX_ID } from '../../../../wdio/screen-objects/testIDs/Screens/ChangePasswordScreensIDs.testIds';
import { ChoosePasswordSelectorsIDs } from '../../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import { ChangePasswordViewSelectorsText } from '../../../locators/Settings/SecurityAndPrivacy/ChangePasswordView.selectors';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';

class ChangePasswordView {
  get title(): DetoxElement {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.CHANGE_PASSWORD,
    );
  }

  get passwordInput(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput(): DetoxElement {
    return Matchers.getElementByID(RESET_PASSWORD_CONFIRM_INPUT_BOX_ID);
  }

  get iUnderstandCheckBox(): DetoxElement {
    return Matchers.getElementByLabel(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get submitButton(): DetoxElement {
    return Matchers.getElementByText(
      ChoosePasswordSelectorsIDs.SAVE_PASSWORD_BUTTON_TEXT,
    );
  }

  async typeInConfirmPasswordInputBox(PASSWORD: string): Promise<void> {
    await Gestures.typeText(this.passwordInput, PASSWORD, {
      hideKeyboard: true,
      elemDescription: 'Confirm password input box',
    });
  }

  async reEnterPassword(PASSWORD: string): Promise<void> {
    await Gestures.typeText(this.confirmPasswordInput, PASSWORD, {
      hideKeyboard: true,
      elemDescription: 'Confirm password input box re-enter',
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await Gestures.waitAndTap(this.iUnderstandCheckBox, {
      elemDescription: 'I understand checkbox',
    });
  }

  async tapSubmitButton(): Promise<void> {
    await Gestures.waitAndTap(this.submitButton, {
      elemDescription: 'Submit button',
    });
  }
}

export default new ChangePasswordView();
