import { ChoosePasswordSelectorsIDs } from '../../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import { ChangePasswordViewSelectorsText } from '../../../selectors/Settings/SecurityAndPrivacy/ChangePasswordView.selectors';
import Matchers from '../../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class ChangePasswordView {
  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ChangePasswordViewSelectorsText.CHANGE_PASSWORD,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ChangePasswordViewSelectorsText.CHANGE_PASSWORD,
        ),
    });
  }

  get passwordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
        ),
    });
  }

  get confirmPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
    });
  }

  get iUnderstandCheckBox(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByLabel(
          ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByAccessibilityId(
          ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
        ),
    });
  }

  get submitButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ChoosePasswordSelectorsIDs.SAVE_PASSWORD_BUTTON_TEXT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ChoosePasswordSelectorsIDs.SAVE_PASSWORD_BUTTON_TEXT,
        ),
    });
  }

  async typeInConfirmPasswordInputBox(PASSWORD: string): Promise<void> {
    await UnifiedGestures.typeText(this.passwordInput, PASSWORD, {
      hideKeyboard: true,
      elemDescription: 'Confirm password input box',
    });
  }

  async reEnterPassword(PASSWORD: string): Promise<void> {
    await UnifiedGestures.typeText(this.confirmPasswordInput, PASSWORD, {
      hideKeyboard: true,
      elemDescription: 'Confirm password input box re-enter',
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.iUnderstandCheckBox, {
      elemDescription: 'I understand checkbox',
    });
  }

  async tapSubmitButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.submitButton, {
      elemDescription: 'Submit button',
    });
  }
}

export default new ChangePasswordView();
