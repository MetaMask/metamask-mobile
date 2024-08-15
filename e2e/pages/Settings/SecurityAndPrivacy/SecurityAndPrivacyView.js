import { SECURITY_PRIVACY_DELETE_WALLET_BUTTON } from '../../../../wdio/screen-objects/testIDs/Screens/SecurityPrivacy.testIds';
import {
  SecurityPrivacyViewSelectorsIDs,
  SecurityPrivacyViewSelectorsText,
} from '../../../selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class SecurityAndPrivacy {
  get changePasswordButton() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_BUTTON,
    );
  }

  get revealSecretRecoveryPhraseButton() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.REVEAL_SEED_BUTTON,
    );
  }

  get deleteWalletButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(SECURITY_PRIVACY_DELETE_WALLET_BUTTON)
      : Matchers.getElementByLabel(SECURITY_PRIVACY_DELETE_WALLET_BUTTON);
  }

  get metaMetricsToggle() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
    );
  }
  get scrollViewIdentifier() {
    return Matchers.getIdentifier(
      SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
    );
  }

  get rememberMeToggle() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.REMEMBER_ME_TOGGLE,
    );
  }

  get changePasswordSection() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER,
    );
  }

  get securitySettingsScroll() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
    );
  }

  get showPrivateKey() {
    return Matchers.getElementByText('Show private key');
  }

  get backUpNow() {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.BACK_UP_NOW,
    );
  }

  get privacyHeader() {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.PRIVACY_HEADING,
    );
  }

  get clearBrowserCookiesButton() {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.CLEAR_BROWSER_COOKIES,
    );
  }

  async tapRevealSecretRecoveryPhraseButton() {
    await Gestures.waitAndTap(this.revealSecretRecoveryPhraseButton);
  }

  async tapChangePasswordButton() {
    await Gestures.waitAndTap(this.changePasswordButton);
  }

  async tapDeleteWalletButton() {
    await Gestures.waitAndTap(this.deleteWalletButton);
  }

  async scrollToChangePasswordView() {
    await Gestures.scrollToElement(
      this.changePasswordButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToDeleteWalletButton() {
    await Gestures.scrollToElement(
      this.deleteWalletButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToTurnOnRememberMe() {
    await Gestures.scrollToElement(
      this.rememberMeToggle,
      this.scrollViewIdentifier,
    );
  }

  async scrollToMetaMetrics() {
    await Gestures.scrollToElement(
      this.metaMetricsToggle,
      this.scrollViewIdentifier,
    );
  }

  async tapMetaMetricsToggle() {
    await Gestures.waitAndTap(this.metaMetricsToggle);
  }

  async tapTurnOnRememberMeToggle() {
    await Gestures.waitAndTap(this.rememberMeToggle);
  }
}

export default new SecurityAndPrivacy();
