import { ChoosePasswordSelectorsIDs } from '../../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import { ChangePasswordViewSelectorsText } from '../../../selectors/Settings/SecurityAndPrivacy/ChangePasswordView.selectors';
import Assertions from '../../../framework/Assertions';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { type AppiumElement } from '../../../framework';
import { PlatformDetector } from '../../../framework/PlatformLocator';

/**
 * Settings → Security & Privacy → Change password (ResetPassword screen).
 *
 * Two-step UI:
 * 1. Confirm current password
 * 2. Enter new password + confirm + checkbox → Save
 */
class ChangePasswordView {
  get title(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.CHANGE_PASSWORD,
    );
  }

  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  /**
   * Shared field id for "current password" (step 1) and "new password" (step 2).
   * Match via Android content-desc / iOS catch-all like CreatePasswordView.
   */
  get passwordInput(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByAndroidUIAutomator(
        `.description("${ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID}")`,
      );
    }
    return Matchers.getElementByNativeXPath(
      this.getCatchAllXPath(ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID),
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

  get iUnderstandCheckBox(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get confirmCurrentPasswordButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.CONFIRM_CURRENT_PASSWORD,
    );
  }

  get saveButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.SAVE_PASSWORD,
    );
  }

  get warningSheetTitle(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.WARNING_PASSWORD_CHANGE_TITLE,
    );
  }

  get confirmPasswordChangeButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.CONFIRM_PASSWORD_CHANGE,
    );
  }

  private getCatchAllXPath(identifier: string): string {
    if (PlatformDetector.isAndroid()) {
      return `//*[@resource-id='${identifier}' or contains(@text,'${identifier}') or contains(@content-desc,'${identifier}')]`;
    }
    return `//*[contains(@name,'${identifier}') or contains(@label,'${identifier}') or contains(@text,'${identifier}')]`;
  }

  async expectTitleVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.title, {
      description: 'Change password title should be visible',
      timeout: 15000,
    });
  }

  async expectCurrentPasswordStepVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.passwordInput, {
      description: 'Current password input should be visible',
      timeout: 15000,
    });
    await Assertions.expectElementToBeVisible(
      this.confirmCurrentPasswordButton,
      {
        description: 'Confirm current password button should be visible',
        timeout: 10000,
      },
    );
  }

  async expectNewPasswordFormVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.confirmPasswordInput, {
      description: 'Confirm new password input should be visible',
      timeout: 30000,
    });
    await Assertions.expectElementToBeVisible(this.iUnderstandCheckBox, {
      description: 'I understand checkbox should be visible',
      timeout: 10000,
    });
  }

  async enterCurrentPassword(password: string): Promise<void> {
    // Do not append newline — Confirm is an explicit button (onSubmitEditing
    // would race with the tap and can leave the form mid-transition).
    await Gestures.typeText(this.passwordInput, password, {
      hideKeyboard: true,
      elemDescription: 'Change password - current password input',
    });
  }

  async tapConfirmCurrentPassword(): Promise<void> {
    await Gestures.waitAndTap(this.confirmCurrentPasswordButton, {
      elemDescription: 'Change password - Confirm current password',
      checkEnabled: true,
    });
  }

  async enterNewPassword(password: string): Promise<void> {
    const text = PlatformDetector.isIOS() ? `${password}\n` : password;
    await Gestures.typeText(this.passwordInput, text, {
      hideKeyboard: false,
      elemDescription: 'Change password - new password input',
    });
  }

  async reEnterNewPassword(password: string): Promise<void> {
    const text = PlatformDetector.isIOS() ? `${password}\n` : password;
    await Gestures.typeText(this.confirmPasswordInput, text, {
      hideKeyboard: false,
      elemDescription: 'Change password - confirm new password input',
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await Gestures.waitAndTap(this.iUnderstandCheckBox, {
      elemDescription: 'Change password - I understand checkbox',
    });
  }

  async tapSaveButton(): Promise<void> {
    await Gestures.waitAndTap(this.saveButton, {
      elemDescription: 'Change password - Save button',
      checkEnabled: true,
    });
  }

  async expectWarningSheetVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.warningSheetTitle, {
      description:
        'Seedless password-change confirmation sheet should be visible',
      timeout: 15000,
    });
  }

  async tapConfirmPasswordChange(): Promise<void> {
    await Gestures.waitAndTap(this.confirmPasswordChangeButton, {
      elemDescription: 'Change password - Confirm on warning sheet',
      checkEnabled: true,
    });
  }

  /**
   * Completes both change-password steps after the screen is open.
   * Seedless Save shows a confirmation sheet that must be confirmed before
   * the password is applied and the success toast appears.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.expectCurrentPasswordStepVisible();
    await this.enterCurrentPassword(currentPassword);
    await this.tapConfirmCurrentPassword();

    await this.expectNewPasswordFormVisible();
    await this.enterNewPassword(newPassword);
    await this.reEnterNewPassword(newPassword);
    await this.tapIUnderstandCheckBox();
    await this.tapSaveButton();

    await this.expectWarningSheetVisible();
    await this.tapConfirmPasswordChange();
  }
}

export default new ChangePasswordView();
