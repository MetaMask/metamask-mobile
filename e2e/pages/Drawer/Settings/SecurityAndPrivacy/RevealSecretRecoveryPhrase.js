import {
  PASSWORD_WARNING_ID,
  REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
  SECRET_RECOVERY_PHRASE_CONTAINER_ID,
  SECRET_RECOVERY_PHRASE_TEXT,
} from '../../../../../wdio/screen-objects/testIDs/Screens/RevelSecretRecoveryPhrase.testIds';
import { RevealSeedViewSelectorsIDs } from '../../../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import Matchers from '../../../../utils/Matchers';
import Gestures from '../../../../utils/Gestures';

class RevealSecretRecoveryPhrase {
  get container() {
    return Matchers.getElementByID(SECRET_RECOVERY_PHRASE_CONTAINER_ID);
  }

  get passwordInput() {
    return Matchers.getElementByID(RevealSeedViewSelectorsIDs.PASSWORD_INPUT);
  }

  get passwordWarning() {
    return Matchers.getElementByID(PASSWORD_WARNING_ID);
  }

  get touchableBox() {
    return Matchers.getElementByID(
      REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
    );
  }

  get recoveryPhrase() {
    return Matchers.getElementByText(SECRET_RECOVERY_PHRASE_TEXT);
  }

  async enterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.passwordInput, password);
  }

  async getContainer() {
    return await this.container;
  }

  async getPasswordWarning() {
    return await this.passwordWarning;
  }

  async getPasswordInput() {
    return await this.passwordInput;
  }

  async getRecoveryPhraseTouchableBox() {
    return await this.touchableBox;
  }

  async getRecoveryPhrase() {
    return await this.recoveryPhrase;
  }
}

export default new RevealSecretRecoveryPhrase();
