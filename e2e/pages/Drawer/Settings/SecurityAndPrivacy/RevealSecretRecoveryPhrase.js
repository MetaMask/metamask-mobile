import {
  PASSWORD_WARNING_ID,
  REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
  SECRET_RECOVERY_PHRASE_CONTAINER_ID,
  SECRET_RECOVERY_PHRASE_TEXT,
} from '../../../../../wdio/screen-objects/testIDs/Screens/RevelSecretRecoveryPhrase.testIds';
import { RevealSeedViewSelectorsIDs } from '../../../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import Matchers from '../../../../utils/Matchers';
import Gestures from '../../../../utils/Gestures';

export default class RevealSecretRecoveryPhrase {
  static get container() {
    return Matchers.getElementByID(SECRET_RECOVERY_PHRASE_CONTAINER_ID);
  }

  static get passwordInput() {
    return Matchers.getElementByID(RevealSeedViewSelectorsIDs.PASSWORD_INPUT);
  }

  static get passwordWarning() {
    return Matchers.getElementByID(PASSWORD_WARNING_ID);
  }

  static get touchableBox() {
    return Matchers.getElementByID(
      REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
    );
  }

  static get recoveryPhrase() {
    return Matchers.getElementByText(SECRET_RECOVERY_PHRASE_TEXT);
  }

  static async enterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.passwordInput, password);
  }

  static async getContainer() {
    return await this.container;
  }

  static async getPasswordWarning() {
    return await this.passwordWarning;
  }

  static async getPasswordInput() {
    return await this.passwordInput;
  }

  static async getRecoveryPhraseTouchableBox() {
    return await this.touchableBox;
  }

  static async getRecoveryPhrase() {
    return await this.recoveryPhrase;
  }
}
