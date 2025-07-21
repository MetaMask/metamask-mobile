import {
  ForgotPasswordModalSelectorsIDs,
  ForgotPasswordModalSelectorsText,
} from '../../selectors/Common/ForgotPasswordModal.selectors';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { OnboardingSelectorText } from '../../selectors/Onboarding/Onboarding.selectors';

class ForgotPasswordModalView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.CONTAINER);
  }

  get title(): DetoxElement {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.TITLE);
  }

  get description(): DetoxElement {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.DESCRIPTION);
  }

  get resetWalletButton(): DetoxElement {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON,
    );
  }

  get yesResetWalletButton(): DetoxElement {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON,
    );
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON,
    );
  }

  get warningText(): DetoxElement {
    return Matchers.getElementByID(
      ForgotPasswordModalSelectorsIDs.WARNING_TEXT,
    );
  }

  get titleText(): DetoxElement {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.TITLE);
  }

  get descriptionText(): DetoxElement {
    return Matchers.getElementByText(
      ForgotPasswordModalSelectorsText.DESCRIPTION,
    );
  }

  get resetWalletText(): DetoxElement {
    return Matchers.getElementByText(
      ForgotPasswordModalSelectorsText.RESET_WALLET,
    );
  }

  get yesResetWalletText(): DetoxElement {
    return Matchers.getElementByText(
      ForgotPasswordModalSelectorsText.YES_RESET_WALLET,
    );
  }

  get cancelText(): DetoxElement {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.CANCEL);
  }

  get warningTextContent(): DetoxElement {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.WARNING);
  }

  get successBottomNotification(): DetoxElement {
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
