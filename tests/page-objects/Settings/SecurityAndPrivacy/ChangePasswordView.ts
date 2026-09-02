import { ChoosePasswordSelectorsIDs } from '../../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import {
  ChangePasswordViewSelectorsIDs,
  ChangePasswordViewSelectorsText,
} from '../../../selectors/Settings/SecurityAndPrivacy/ChangePasswordView.selectors';
import Assertions from '../../../framework/Assertions';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { type AppiumElement } from '../../../framework';
import { PlatformDetector } from '../../../framework/PlatformLocator';
import enContent from '../../../../locales/languages/en.json';

/**
 * Settings → Security & Privacy → Change password (ResetPassword screen).
 *
 * Two-step UI:
 * 1. Confirm current password
 * 2. Enter new password + confirm + checkbox → Save
 *
 * On devices with biometrics available (non-E2E), ResetPassword may
 * auto-reauthenticate and skip step 1. E2E builds (HAS_TEST_OVERRIDES) always
 * show step 1 for a deterministic path.
 */
class ChangePasswordView {
  /**
   * Do not assert title text alone — Settings list button uses the same
   * "Change password" string, so that matcher can pass without navigation.
   */
  get screen(): Promise<AppiumElement> {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByAndroidUIAutomator(
        `.resourceIdMatches(".*${ChangePasswordViewSelectorsIDs.SCREEN_ID}.*")`,
      );
    }
    return Matchers.getElementByID(ChangePasswordViewSelectorsIDs.SCREEN_ID);
  }

  get enterCurrentPasswordLabel(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.ENTER_CURRENT_PASSWORD,
    );
  }

  /** Only mounted on the new-password form (step 2). */
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  /**
   * Shared field id for "current password" (step 1) and "new password" (step 2).
   */
  get passwordInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  get iUnderstandCheckBox(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  /**
   * Step-1 Confirm uses SUBMIT_BUTTON_ID; Save on step 2 uses the same id but
   * different label — only one screen is mounted at a time.
   */
  get confirmCurrentPasswordButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID);
  }

  get saveButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ChangePasswordViewSelectorsText.SAVE_PASSWORD,
    );
  }

  get incorrectPasswordWarning(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      enContent.reveal_credential.warning_incorrect_password,
    );
  }

  get newPasswordLabel(): Promise<AppiumElement> {
    return Matchers.getElementByText(enContent.reset_password.password);
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

  /**
   * Wait until ResetPassword body is mounted (after biometry loader if any).
   * Uses screen testID — not the Settings "Change password" button text.
   */
  async expectScreenVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.screen, {
      description:
        'ResetPassword screen (account-backup-step-4-screen) should be visible',
      timeout: 30000,
    });
  }

  /** @deprecated Use expectScreenVisible — title text matches Settings button. */
  async expectTitleVisible(): Promise<void> {
    await this.expectScreenVisible();
  }

  async expectCurrentPasswordStepVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.enterCurrentPasswordLabel, {
      description: 'Enter your current password label should be visible',
      timeout: 15000,
    });
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
    // Prefer "New password" text over container testID — iOS often reports
    // ~create-password-screen as not displayed while child text is visible
    // (same pattern as seedless create-password readiness helpers).
    await Assertions.expectElementToBeVisible(this.newPasswordLabel, {
      description: 'New password label should be visible (ResetForm)',
      timeout: 30000,
    });
    await Assertions.expectElementToBeVisible(this.iUnderstandCheckBox, {
      description: 'I understand checkbox should be visible',
      timeout: 10000,
    });
    await Assertions.expectElementToBeVisible(this.confirmPasswordInput, {
      description: 'Confirm new password input should be visible',
      timeout: 15000,
    });
  }

  /**
   * True when biometry auto-reauth skipped the current-password step.
   * Short probe — E2E builds skip Face ID auto-reauth.
   */
  private async isNewPasswordFormShowing(): Promise<boolean> {
    try {
      await Assertions.expectElementToBeVisible(this.newPasswordLabel, {
        description: 'Probe for new-password label',
        timeout: 3000,
      });
      return true;
    } catch {
      return false;
    }
  }

  private async diagnoseFailedTransitionToResetForm(
    formError: unknown,
  ): Promise<never> {
    try {
      await Assertions.expectElementToBeVisible(this.incorrectPasswordWarning, {
        description: 'Probe for incorrect-password warning',
        timeout: 1500,
      });
      throw new Error(
        'Change password: still on current-password step with "Incorrect password" after Confirm — new-password form did not appear',
      );
    } catch (warningError) {
      if (
        warningError instanceof Error &&
        warningError.message.includes('Incorrect password')
      ) {
        throw warningError;
      }
    }

    try {
      await Assertions.expectElementToBeVisible(
        this.enterCurrentPasswordLabel,
        {
          description: 'Probe: still on current-password step',
          timeout: 1500,
        },
      );
      throw new Error(
        'Change password: still on current-password step after Confirm (password likely not applied to React state, or Confirm did not run verify). ResetForm / New password never appeared.',
      );
    } catch (stepError) {
      if (
        stepError instanceof Error &&
        stepError.message.includes('still on current-password')
      ) {
        throw stepError;
      }
    }

    throw formError;
  }

  async enterCurrentPassword(password: string): Promise<void> {
    // iOS: per-character addValue so controlled TextField onChangeText fires.
    // Do not hideKeyboard before Confirm — tapOutside can race the enable state.
    // Mirror LoginView: leave keyboard up, then tap the enabled Confirm button.
    if (PlatformDetector.isIOS()) {
      await Gestures.typeTextByCharacters(this.passwordInput, password);
      return;
    }
    await Gestures.typeText(this.passwordInput, password, {
      hideKeyboard: true,
      elemDescription: 'Change password - current password input',
    });
  }

  async tapConfirmCurrentPassword(): Promise<void> {
    await Gestures.waitAndTap(this.confirmCurrentPasswordButton, {
      elemDescription: 'Change password - Confirm current password',
      checkEnabled: true,
      waitForInteractive: true,
      timeout: 15000,
    });
  }

  async enterNewPassword(password: string): Promise<void> {
    if (PlatformDetector.isIOS()) {
      await Gestures.typeTextByCharacters(this.passwordInput, password, {
        submitWithReturn: true,
      });
      return;
    }
    await Gestures.typeText(this.passwordInput, password, {
      hideKeyboard: false,
      elemDescription: 'Change password - new password input',
    });
  }

  async reEnterNewPassword(password: string): Promise<void> {
    if (PlatformDetector.isIOS()) {
      await Gestures.typeTextByCharacters(this.confirmPasswordInput, password, {
        submitWithReturn: true,
      });
      return;
    }
    await Gestures.typeText(this.confirmPasswordInput, password, {
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
   * Completes change-password after the Settings entry is tapped.
   * Seedless Save shows a confirmation sheet that must be confirmed before
   * the password is applied and the success toast appears.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.expectScreenVisible();

    const skippedCurrentPasswordStep = await this.isNewPasswordFormShowing();
    if (!skippedCurrentPasswordStep) {
      await this.expectCurrentPasswordStepVisible();
      await this.enterCurrentPassword(currentPassword);
      await this.tapConfirmCurrentPassword();
      try {
        await this.expectNewPasswordFormVisible();
      } catch (error) {
        await this.diagnoseFailedTransitionToResetForm(error);
      }
    }

    await this.enterNewPassword(newPassword);
    await this.reEnterNewPassword(newPassword);
    await this.tapIUnderstandCheckBox();
    await this.tapSaveButton();

    await this.expectWarningSheetVisible();
    await this.tapConfirmPasswordChange();
  }
}

export default new ChangePasswordView();
