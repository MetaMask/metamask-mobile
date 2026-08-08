import {
  ForgotPasswordModalSelectorsIDs,
  ForgotPasswordModalSelectorsText,
} from '../../../app/util/ForgotPasswordModal.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { OnboardingSelectorText } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import { EncapsulatedElementType } from '../../framework';

class ForgotPasswordModalView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.CONTAINER);
  }

  get title(): EncapsulatedElementType {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.TITLE);
  }

  get description(): EncapsulatedElementType {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.DESCRIPTION);
  }

  get resetWalletButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON,
    );
  }

  get yesResetWalletButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON,
    );
  }

  get cancelButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON,
    );
  }

  get warningText(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.WARNING_TEXT,
    );
  }

  get titleText(): EncapsulatedElementType {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.TITLE);
  }

  get descriptionText(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ForgotPasswordModalSelectorsText.DESCRIPTION,
    );
  }

  get resetWalletText(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ForgotPasswordModalSelectorsText.RESET_WALLET,
    );
  }

  get yesResetWalletText(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ForgotPasswordModalSelectorsText.YES_RESET_WALLET,
    );
  }

  get cancelText(): EncapsulatedElementType {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.CANCEL);
  }

  get warningTextContent(): EncapsulatedElementType {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.WARNING);
  }

  get successBottomNotification(): EncapsulatedElementType {
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
