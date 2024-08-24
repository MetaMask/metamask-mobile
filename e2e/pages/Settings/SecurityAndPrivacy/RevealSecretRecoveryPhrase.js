import { RevealSeedViewSelectorsIDs } from '../../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class RevealSecretRecoveryPhrase {
  get container() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CONTAINER_ID,
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
  get passwordInputToRevealSecretCredential() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
    );
  }

  get recoveryPhrase() {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_TEXT,
    );
  }
  get revealSecretRecoveryPhraseButton() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_CREDENTIAL_REVEAL_BUTTON_ID,
    );
  }

  get copyPrivateCredentialToClipboardButton() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.COPY_PRIVATE_CREDENTIAL_TO_CLIPBOARD_BUTTON,
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
      this.passwordInputToRevealSecretCredential,
      password,
    );
  }

  async tapToReveal() {
    await Gestures.waitAndTap(this.revealSecretRecoveryPhraseButton);
  }

  async tapToCopyPrivateCredentialToClipboard() {
    await Gestures.tap(this.copyPrivateCredentialToClipboardButton);
  }
}

export default new RevealSecretRecoveryPhrase();
