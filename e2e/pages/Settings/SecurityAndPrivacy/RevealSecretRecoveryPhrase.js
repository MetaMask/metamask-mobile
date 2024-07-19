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

  get touchableBox() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
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
