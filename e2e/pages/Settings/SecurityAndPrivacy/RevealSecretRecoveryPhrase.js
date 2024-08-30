import {
  RevealSeedViewSelectorsIDs,
  RevealSeedViewSelectorsText,
} from '../../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class RevealSecretRecoveryPhrase {
  get container() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID,
    );
  }

  // This is the password requested at login
  // and should probably be moved eventually into LoginView.js
  get passwordInput() {
    return Matchers.getElementByID(RevealSeedViewSelectorsIDs.PASSWORD_INPUT);
  }

  get passwordWarning() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
    );
  }

  // This is the password requested to expose secret credentials
  get passwordInputToRevealCredential() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
    );
  }

  get scrollViewIdentifier() {
    return Matchers.getIdentifier(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_SCROLL_ID,
    );
  }

  get recoveryPhrase() {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_TEXT,
    );
  }
  get revealSecretRecoveryPhraseButton() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
    );
  }

  get revealCredentialCopyToClipboardButton() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
    );
  }

  get revealCredentialQRCodeTab() {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_QR_CODE_TAB_ID,
    );
  }

  get revealCredentialQRCodeImage() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_QR_CODE_IMAGE_ID,
    );
  }

  get doneButton() {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_DONE,
    );
  }

  // This is the password requested at login view
  // and should probably be moved eventually into LoginView.js
  async enterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.passwordInput, password);
  }
  // This is the password requested to expose secret credentials
  async enterPasswordToRevealSecretCredential(password) {
    await Gestures.typeTextAndHideKeyboard(
      this.passwordInputToRevealCredential,
      password,
    );
  }

  async tapToReveal() {
    await Gestures.waitAndTap(this.revealSecretRecoveryPhraseButton);
  }

  async tapToCopyCredentialToClipboard() {
    await Gestures.tap(this.revealCredentialCopyToClipboardButton);
  }

  async tapToRevealPrivateCredentialQRCode() {
    await Gestures.tap(this.revealCredentialQRCodeTab);
  }

  async scrollToDone() {
    await Gestures.scrollToElement(this.doneButton, this.scrollViewIdentifier);
  }

  async tapDoneButton() {
    return Gestures.waitAndTap(this.doneButton);
  }
}

export default new RevealSecretRecoveryPhrase();
