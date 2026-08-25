import {
  ForgotPasswordModalSelectorsIDs,
  ForgotPasswordModalSelectorsText,
} from '../../../app/util/ForgotPasswordModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { OnboardingSelectorText } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import { type AppiumElement } from '../../framework';

class ForgotPasswordModalView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.CONTAINER);
  }

  get title(): Promise<AppiumElement> {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.TITLE);
  }

  get description(): Promise<AppiumElement> {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.DESCRIPTION);
  }

  get resetWalletButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON,
    );
  }

  get yesResetWalletButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON,
    );
  }

  get cancelButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON,
    );
  }

  get warningText(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.WARNING_TEXT,
    );
  }

  get titleText(): Promise<AppiumElement> {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.TITLE);
  }

  get descriptionText(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ForgotPasswordModalSelectorsText.DESCRIPTION,
    );
  }

  get resetWalletText(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ForgotPasswordModalSelectorsText.RESET_WALLET,
    );
  }

  get yesResetWalletText(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      ForgotPasswordModalSelectorsText.YES_RESET_WALLET,
    );
  }

  get cancelText(): Promise<AppiumElement> {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.CANCEL);
  }

  get warningTextContent(): Promise<AppiumElement> {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.WARNING);
  }

  get successBottomNotification(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      OnboardingSelectorText.SUCCESSFUL_WALLET_RESET,
    );
  }

  async tapResetWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.resetWalletButton, { timeout: 25000 });
  }

  async tapYesResetWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.yesResetWalletButton);
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapResetWalletByText(): Promise<void> {
    await Gestures.waitAndTap(this.resetWalletText);
  }

  async tapYesResetWalletByText(): Promise<void> {
    await Gestures.waitAndTap(this.yesResetWalletText);
  }

  async tapCancelByText(): Promise<void> {
    await Gestures.waitAndTap(this.cancelText);
  }
}

export default new ForgotPasswordModalView();
