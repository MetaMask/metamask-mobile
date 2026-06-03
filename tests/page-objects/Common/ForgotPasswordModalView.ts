import {
  ForgotPasswordModalSelectorsIDs,
  ForgotPasswordModalSelectorsText,
} from '../../../app/util/ForgotPasswordModal.testIds';
import Matchers from '../../framework/Matchers';
import { OnboardingSelectorText } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class ForgotPasswordModalView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ForgotPasswordModalSelectorsIDs.CONTAINER,
        ),
    });
  }

  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.TITLE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ForgotPasswordModalSelectorsIDs.TITLE,
        ),
    });
  }

  get description(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.DESCRIPTION),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ForgotPasswordModalSelectorsIDs.DESCRIPTION,
        ),
    });
  }

  get resetWalletButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON,
        ),
    });
  }

  get yesResetWalletButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON,
        ),
    });
  }

  get warningText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.WARNING_TEXT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ForgotPasswordModalSelectorsIDs.WARNING_TEXT,
        ),
    });
  }

  get titleText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(ForgotPasswordModalSelectorsText.TITLE),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ForgotPasswordModalSelectorsText.TITLE,
        ),
    });
  }

  get descriptionText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(ForgotPasswordModalSelectorsText.DESCRIPTION),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ForgotPasswordModalSelectorsText.DESCRIPTION,
        ),
    });
  }

  get resetWalletText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ForgotPasswordModalSelectorsText.RESET_WALLET,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ForgotPasswordModalSelectorsText.RESET_WALLET,
        ),
    });
  }

  get yesResetWalletText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ForgotPasswordModalSelectorsText.YES_RESET_WALLET,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ForgotPasswordModalSelectorsText.YES_RESET_WALLET,
        ),
    });
  }

  get cancelText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(ForgotPasswordModalSelectorsText.CANCEL),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ForgotPasswordModalSelectorsText.CANCEL,
        ),
    });
  }

  get warningTextContent(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(ForgotPasswordModalSelectorsText.WARNING),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ForgotPasswordModalSelectorsText.WARNING,
        ),
    });
  }

  get successBottomNotification(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          OnboardingSelectorText.SUCCESSFUL_WALLET_RESET,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          OnboardingSelectorText.SUCCESSFUL_WALLET_RESET,
        ),
    });
  }

  async tapResetWalletButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.resetWalletButton, {
      timeout: 25000,
    });
  }

  async tapYesResetWalletButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.yesResetWalletButton);
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton);
  }

  async tapResetWalletByText(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.resetWalletText);
  }

  async tapYesResetWalletByText(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.yesResetWalletText);
  }

  async tapCancelByText(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelText);
  }
}

export default new ForgotPasswordModalView();
