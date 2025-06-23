import { ForgotPasswordModalSelectorsIDs, ForgotPasswordModalSelectorsText } from '../../selectors/Common/ForgotPasswordModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class ForgotPasswordModalView {
  get container() {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.CONTAINER);
  }

  get title() {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.TITLE);
  }

  get description() {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.DESCRIPTION);
  }

  get resetWalletButton() {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON);
  }

  get yesResetWalletButton() {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON);
  }

  get cancelButton() {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON);
  }

  get warningText() {
    return Matchers.getElementByID(ForgotPasswordModalSelectorsIDs.WARNING_TEXT);
  }

  get titleText() {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.TITLE);
  }

  get descriptionText() {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.DESCRIPTION);
  }

  get resetWalletText() {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.RESET_WALLET);
  }

  get yesResetWalletText() {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.YES_RESET_WALLET);
  }

  get cancelText() {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.CANCEL);
  }

  get warningTextContent() {
    return Matchers.getElementByText(ForgotPasswordModalSelectorsText.WARNING);
  }

  async tapResetWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.resetWalletButton, { timeout: 25000, delayBeforeTap: 1000 });
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