import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import {
  CREATE_PASSWORD_INPUT_FIRST_FIELD,
  CONFIRM_PASSWORD_INPUT_FIRST_FIELD,
} from '../../../wdio/screen-objects/testIDs/Screens/WalletSetupScreen.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
  asDetoxElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { getDriver } from '../../framework/PlaywrightUtilities';
import enContent from '../../../locales/languages/en.json';
import PlaywrightGestures from '../../framework/PlaywrightGestures';

class CreatePasswordView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  get newPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
        ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(CREATE_PASSWORD_INPUT_FIRST_FIELD),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            '(//XCUIElementTypeOther[@name="textfield"])[1]',
          ),
      },
    });
  }

  get confirmPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(CONFIRM_PASSWORD_INPUT_FIRST_FIELD),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            '(//XCUIElementTypeOther[@name="textfield"])[2]',
          ),
      },
    });
  }

  get iUnderstandCheckbox(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
        ),
    });
  }

  get iUnderstandCheckboxNewWallet(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get submitButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
        ),
    });
  }

  get passwordError(): DetoxElement {
    return Matchers.getElementByText(enContent.import_from_seed.password_error);
  }

  async resetPasswordInputs(): Promise<void> {
    await Gestures.typeText(this.newPasswordInput as DetoxElement, '', {
      hideKeyboard: true,
    });
    await Gestures.typeText(this.confirmPasswordInput as DetoxElement, '', {
      hideKeyboard: true,
    });
  }

  async enterPassword(password: string): Promise<void> {
    await UnifiedGestures.typeText(this.newPasswordInput, password, {
      description: 'Create Password New Password Input',
    });
  }

  async reEnterPassword(password: string): Promise<void> {
    await UnifiedGestures.typeText(this.confirmPasswordInput, password, {
      description: 'Create Password Confirm Password Input',
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.tap(asDetoxElement(this.iUnderstandCheckbox), {
          elemDescription: 'Create Password - I Understand Checkbox',
        });
      },
      appium: async () => {
        const drv = getDriver();
        await drv.hideKeyboard();
        await PlaywrightGestures.tap(
          await asPlaywrightElement(this.iUnderstandCheckbox),
        );
      },
    });
  }

  async tapCreatePasswordButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.submitButton, {
      description: 'Create Password Submit Button',
    });
  }

  async isVisible(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const el = await asPlaywrightElement(this.newPasswordInput);
        await el.waitForDisplayed({ timeout: 10000 });
      },
    });
  }
}

export default new CreatePasswordView();
