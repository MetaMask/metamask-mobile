import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import enContent from '../../../locales/languages/en.json';
import type { AppiumElement } from '../../framework/AppiumElement';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { ImportFromSeedSelectorsIDs } from '../../../app/components/Views/ImportFromSecretRecoveryPhrase/ImportFromSeed.testIds';
import type { AppiumElement } from '../../framework';

class CreatePasswordView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  get newPasswordInput(): Promise<AppiumElement> {
    // Android: match the inner EditText via content-desc (UiAutomator).
    // iOS: catch-all XPath (testID may land on a wrapper).
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByAndroidUIAutomator(
        `.description("${ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}")`,
      );
    }
    return Matchers.getElementByNativeXPath(
      this.getCatchAllXPath(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
    );
  }

  get passwordVisibilityIcon(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByID(
        ImportFromSeedSelectorsIDs.NEW_PASSWORD_VISIBILITY_ID,
      );
    }
    return Matchers.getElementByNativeXPath(
      this.getCatchAllXPath(
        ImportFromSeedSelectorsIDs.NEW_PASSWORD_VISIBILITY_ID,
      ),
    );
  }

  get confirmPasswordVisibilityIcon(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ImportFromSeedSelectorsIDs.CONFIRM_PASSWORD_VISIBILITY_ID,
    );
  }

  get confirmPasswordInput(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByAndroidUIAutomator(
        `.description("${ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID}")`,
      );
    }
    return Matchers.getElementByNativeXPath(
      this.getCatchAllXPath(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      ),
    );
  }

  get newWalletConfirmPasswordInput(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByID(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      );
    }
    return Matchers.getElementByNativeXPath(
      this.getCatchAllXPath(
        ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
      ),
    );
  }

  get iUnderstandCheckbox(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get iUnderstandCheckboxNewWallet(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get submitButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID);
  }

  get passwordError(): Promise<AppiumElement> {
    return Matchers.getElementByText(enContent.import_from_seed.password_error);
  }

  private getCatchAllXPath(identifier: string): string {
    if (PlatformDetector.isAndroid()) {
      return `//*[@resource-id='${identifier}' or contains(@text,'${identifier}') or contains(@content-desc,'${identifier}')]`;
    }
    return `//*[contains(@name,'${identifier}') or contains(@label,'${identifier}') or contains(@text,'${identifier}')]`;
  }

  async resetPasswordInputs(): Promise<void> {
    await Gestures.typeText(this.newPasswordInput, '', {
      hideKeyboard: true,
      clearFirst: true,
      checkVisibility: false,
    });
    await Gestures.typeText(this.confirmPasswordInput, '', {
      hideKeyboard: true,
      clearFirst: true,
      checkVisibility: false,
    });
  }

  async enterPassword(password: string): Promise<void> {
    const text = PlatformDetector.isIOS() ? `${password}\n` : password;
    await Gestures.typeText(this.newPasswordInput, text, {
      elemDescription: 'Create Password New Password Input',
      hideKeyboard: false,
    });
  }

  async reEnterPassword(password: string): Promise<void> {
    const text = PlatformDetector.isIOS() ? `${password}\n` : password;
    await Gestures.typeText(this.confirmPasswordInput, text, {
      elemDescription: 'Create Password Confirm Password Input',
      hideKeyboard: false,
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await Gestures.waitAndTap(this.iUnderstandCheckbox, {
      elemDescription: 'Create Password - I Understand Checkbox',
    });
  }

  /**
   * Reads marketing checkbox selection from native accessibility attributes.
   * Returns undefined when state cannot be determined.
   */
  private parseMarketingCheckboxCheckedState(
    attributes: Record<string, unknown>,
  ): boolean | undefined {
    const accessibilityState = attributes.accessibilityState as
      | { checked?: boolean }
      | undefined;

    if (typeof accessibilityState?.checked === 'boolean') {
      return accessibilityState.checked;
    }

    if (typeof attributes.checked === 'boolean') {
      return attributes.checked;
    }

    if (attributes.checked === 'true') {
      return true;
    }

    if (attributes.checked === 'false') {
      return false;
    }

    if (attributes.value === 1 || attributes.value === '1') {
      return true;
    }

    if (attributes.value === 0 || attributes.value === '0') {
      return false;
    }

    if (attributes['aria-checked'] === 'true') {
      return true;
    }

    if (attributes['aria-checked'] === 'false') {
      return false;
    }

    return undefined;
  }

  private async readMarketingCheckboxChecked(
    checkbox: AppiumElement,
  ): Promise<boolean | undefined> {
    // Fetch attributes independently. Android UiAutomator2 does not support
    // `aria-checked` (only `checked` / `value`); requesting it floods WARN/ERROR
    // logs and used to abort the whole read when tried first.
    const attributes: Record<string, unknown> = {};
    const attributeNames: ('checked' | 'value' | 'aria-checked')[] =
      PlatformDetector.isIOS()
        ? ['checked', 'value', 'aria-checked']
        : ['checked'];

    for (const name of attributeNames) {
      try {
        attributes[name] = await checkbox.getAttribute(name);
      } catch {
        // Unsupported on this platform/driver — try the next candidate.
      }
    }

    return this.parseMarketingCheckboxCheckedState(attributes);
  }

  /**
   * Ensures the marketing opt-in checkbox is checked for OAuth flows without
   * toggling it off when already selected (e.g. USA locale default, TO-776).
   */
  async ensureMarketingOptInChecked(): Promise<void> {
    const checkbox = (await Promise.resolve(
      this.iUnderstandCheckbox,
    )) as AppiumElement;
    const isChecked = await this.readMarketingCheckboxChecked(checkbox);

    if (isChecked === false) {
      await Gestures.waitAndTap(this.iUnderstandCheckbox, {
        elemDescription: 'Create Password - Marketing opt-in checkbox',
      });
      return;
    }

    if (isChecked === undefined) {
      throw new Error(
        'Unable to determine marketing opt-in checkbox state in Appium',
      );
    }
  }

  async tapCreatePasswordButton(): Promise<void> {
    await Gestures.waitAndTap(this.submitButton, {
      elemDescription: 'Create Password Submit Button',
    });
  }

  async tapPasswordVisibilityIcon(): Promise<void> {
    await Gestures.waitAndTap(this.passwordVisibilityIcon, {
      elemDescription: 'Create Password Password Visibility Icon',
    });
  }

  async tapConfirmPasswordVisibilityIcon(): Promise<void> {
    await Gestures.waitAndTap(this.confirmPasswordVisibilityIcon, {
      elemDescription: 'Create Password Confirm Password Visibility Icon',
    });
  }

  async isVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.newPasswordInput, {
      timeout: 10000,
      description: 'Create password input should be visible',
    });
  }

  async isNewAccountScreenFieldsVisible(): Promise<void> {
    await this.isVisible();
  }

  async inputPasswordInFirstField(password: string): Promise<void> {
    await this.enterPassword(password);
  }

  async inputConfirmPasswordField(password: string): Promise<void> {
    await Gestures.typeText(this.newWalletConfirmPasswordInput, password, {
      elemDescription: 'Create Password Confirm Password Input',
      hideKeyboard: false,
    });
  }
}

export default new CreatePasswordView();
