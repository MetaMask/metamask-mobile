import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import enContent from '../../../locales/languages/en.json';
import {
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { ImportFromSeedSelectorsIDs } from '../../../app/components/Views/ImportFromSecretRecoveryPhrase/ImportFromSeed.testIds';

class CreatePasswordView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  get newPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        device.getPlatform() === 'ios'
          ? Matchers.getElementByID(
              ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
            )
          : Matchers.getElementByLabel(
              ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
            ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByAndroidUIAutomator(
            `.description("${ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}")`,
          ),
        ios: () =>
          PlaywrightMatchers.getElementByCatchAll(
            ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
          ),
      },
    });
  }
  get passwordVisibilityIcon(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ImportFromSeedSelectorsIDs.NEW_PASSWORD_VISIBILITY_ID,
        ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            ImportFromSeedSelectorsIDs.NEW_PASSWORD_VISIBILITY_ID,
          ),
        ios: () =>
          PlaywrightMatchers.getElementByCatchAll(
            ImportFromSeedSelectorsIDs.NEW_PASSWORD_VISIBILITY_ID,
          ),
      },
    });
  }

  get confirmPasswordVisibilityIcon(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ImportFromSeedSelectorsIDs.CONFIRM_PASSWORD_VISIBILITY_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ImportFromSeedSelectorsIDs.CONFIRM_PASSWORD_VISIBILITY_ID,
        ),
    });
  }

  get confirmPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        device.getPlatform() === 'ios'
          ? Matchers.getElementByID(
              ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            )
          : Matchers.getElementByLabel(
              ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByAndroidUIAutomator(
            `.description("${ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID}")`,
          ),
        ios: () =>
          PlaywrightMatchers.getElementByCatchAll(
            ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
          ),
      },
    });
  }

  get newWalletConfirmPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        device.getPlatform() === 'ios'
          ? Matchers.getElementByID(
              ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            )
          : Matchers.getElementByLabel(
              ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            {
              exact: true,
            },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByCatchAll(
            ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
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
          {
            exact: true,
          },
        ),
    });
  }

  get iUnderstandCheckboxNewWallet(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get submitButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
            {
              exact: true,
            },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
          ),
      },
    });
  }

  get passwordError(): EncapsulatedElementType {
    return Matchers.getElementByText(enContent.import_from_seed.password_error);
  }

  async resetPasswordInputs(): Promise<void> {
    await Gestures.typeText(asDetoxElement(this.newPasswordInput), '', {
      hideKeyboard: true,
      clearFirst: true,
      checkVisibility: false,
    });
    await Gestures.typeText(asDetoxElement(this.confirmPasswordInput), '', {
      hideKeyboard: true,
      clearFirst: true,
      checkVisibility: false,
    });
  }

  async enterPassword(password: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(
          asDetoxElement(this.newPasswordInput),
          password,
          {
            elemDescription: 'Create Password New Password Input',
            hideKeyboard: true,
            checkVisibility: false,
            checkEnabled: false,
          },
        );
      },
      appium: async () => {
        const isIOS = await PlatformDetector.isIOS();
        await UnifiedGestures.typeText(
          this.newPasswordInput,
          isIOS ? `${password}\n` : password,
          {
            // once merged, remove me and create a typeText in Playwright Gestures
            description: 'Create Password New Password Input',
          },
        );
      },
    });
  }

  async reEnterPassword(password: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(
          asDetoxElement(this.confirmPasswordInput),
          password,
          {
            elemDescription: 'Create Password Confirm Password Input',
            hideKeyboard: true,
            checkVisibility: false,
            checkEnabled: false,
          },
        );
      },
      appium: async () => {
        const isIOS = await PlatformDetector.isIOS();
        await UnifiedGestures.typeText(
          this.confirmPasswordInput,
          isIOS ? `${password}\n` : password,
          {
            description: 'Create Password Confirm Password Input',
          },
        );
      },
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.tap(asDetoxElement(this.iUnderstandCheckbox), {
          elemDescription: 'Create Password - I Understand Checkbox',
          checkVisibility: false,
        });
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.iUnderstandCheckbox, {
          description: 'Create Password - I Understand Checkbox',
        });
      },
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
    el: Detox.IndexableNativeElement,
  ): Promise<boolean | undefined> {
    try {
      const attributes = (await el.getAttributes()) as Record<string, unknown>;
      return this.parseMarketingCheckboxCheckedState(attributes);
    } catch {
      return undefined;
    }
  }

  private async readMarketingCheckboxCheckedAppium(
    checkbox: Awaited<ReturnType<typeof asPlaywrightElement>>,
  ): Promise<boolean | undefined> {
    try {
      const attributes: Record<string, unknown> = {
        'aria-checked': await checkbox.getAttribute('aria-checked'),
        checked: await checkbox.getAttribute('checked'),
        value: await checkbox.getAttribute('value'),
      };

      return this.parseMarketingCheckboxCheckedState(attributes);
    } catch {
      return undefined;
    }
  }

  /**
   * Ensures the marketing opt-in checkbox is checked for OAuth flows without
   * toggling it off when already selected (e.g. USA locale default, TO-776).
   */
  async ensureMarketingOptInChecked(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const checkbox = asDetoxElement(this.iUnderstandCheckbox);
        const el = (await checkbox) as Detox.IndexableNativeElement;
        const isChecked = await this.readMarketingCheckboxChecked(el);

        // Only tap when explicitly unchecked. Ambiguous state keeps the default
        // (USA devices start checked per TO-776).
        if (isChecked === false) {
          await Gestures.tap(checkbox, {
            elemDescription: 'Create Password - Marketing opt-in checkbox',
            checkVisibility: false,
          });
        }
      },
      appium: async () => {
        const checkbox = await asPlaywrightElement(this.iUnderstandCheckbox);
        const isChecked =
          await this.readMarketingCheckboxCheckedAppium(checkbox);

        if (isChecked === false) {
          await UnifiedGestures.waitAndTap(this.iUnderstandCheckbox, {
            description: 'Create Password - Marketing opt-in checkbox',
          });
          return;
        }

        if (isChecked === undefined) {
          throw new Error(
            'Unable to determine marketing opt-in checkbox state in Appium',
          );
        }
      },
    });
  }

  async tapCreatePasswordButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(asDetoxElement(this.submitButton), {
          elemDescription: 'Create Password Submit Button',
          checkVisibility: false,
        });
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.submitButton, {
          description: 'Create Password Submit Button',
        });
      },
    });
  }
  async tapPasswordVisibilityIcon(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.tap(asDetoxElement(this.passwordVisibilityIcon), {
          elemDescription: 'Create Password Password Visibility Icon',
        });
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.passwordVisibilityIcon, {
          description: 'Create Password Password Visibility Icon',
        });
      },
    });
  }

  async tapConfirmPasswordVisibilityIcon(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.tap(asDetoxElement(this.confirmPasswordVisibilityIcon), {
          elemDescription: 'Create Password Confirm Password Visibility Icon',
        });
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.confirmPasswordVisibilityIcon, {
          description: 'Create Password Confirm Password Visibility Icon',
        });
      },
    });
  }

  async isVisible(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(
          asDetoxElement(this.newPasswordInput),
          {
            description: 'Create password input should be visible',
          },
        );
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(this.newPasswordInput),
          {
            timeout: 10000,
            description: 'Create password input should be visible',
          },
        );
      },
    });
  }

  async isNewAccountScreenFieldsVisible(): Promise<void> {
    await this.isVisible();
  }

  async inputPasswordInFirstField(password: string): Promise<void> {
    await this.enterPassword(password);
  }

  async inputConfirmPasswordField(password: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(
          asDetoxElement(this.newWalletConfirmPasswordInput),
          password,
          {
            elemDescription: 'Create Password Confirm Password Input',
            hideKeyboard: true,
            checkVisibility: false,
            checkEnabled: false,
          },
        );
      },
      appium: async () => {
        await UnifiedGestures.typeText(
          this.newWalletConfirmPasswordInput,
          password,
          {
            description: 'Create Password Confirm Password Input',
          },
        );
      },
    });
  }
}

export default new CreatePasswordView();
