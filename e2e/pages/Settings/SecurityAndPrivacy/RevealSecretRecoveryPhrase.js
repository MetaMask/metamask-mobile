import { RevealSeedViewSelectorsIDs } from '../../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class RevealSecretRecoveryPhrase {
  get container() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CONTAINER_ID,
    );
  }

  get passwordInput() {
    return Matchers.getElementByID(RevealSeedViewSelectorsIDs.PASSWORD_INPUT);
  }

  get passwordWarning() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
    );
  }

  get copyPrivateCredentialToClipboardButton() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.COPY_PRIVATE_CREDENTIAL_TO_CLIPBOARD_BUTTON,
    );
  }

  get recoveryPhrase() {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_TEXT,
    );
  }

  async enterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.passwordInput, password);
  }
}

export default new RevealSecretRecoveryPhrase();
