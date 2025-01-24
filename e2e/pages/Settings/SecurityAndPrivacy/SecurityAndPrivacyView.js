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
  get clearPrivacyDataButton() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CLEAR_PRIVACY_DATA_BUTTON,
    );
  }

  get securityAndPrivacyHeading() {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.SECURITY_AND_PRIVACY_HEADING,
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

  get autoLockSection() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.AUTO_LOCK_SECTION,
    );
  }

  get autoLockDefault30Seconds() {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.AUTO_LOCK_30_SECONDS,
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

  get showPrivateKeyButton() {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.SHOW_PRIVATE_KEY,
    );
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

  get revealPrivateKeyButton() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.SHOW_PRIVATE_KEY,
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

  async scrollToRevealPrivateKey() {
    await Gestures.scrollToElement(
      this.revealPrivateKeyButton,
      this.scrollViewIdentifier,
    );
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

  async scrollToClearPrivacyData() {
    await Gestures.scrollToElement(
      this.clearPrivacyDataButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToMetaMetrics() {
    await Gestures.scrollToElement(
      this.metaMetricsToggle,
      this.scrollViewIdentifier,
    );
  }

  async scrollToAutoLockSection() {
    await Gestures.scrollToElement(
      this.autoLockSection,
      this.scrollViewIdentifier,
    );
  }

  async tapAutoLock30Seconds() {
    await Gestures.waitAndTap(this.autoLockDefault30Seconds);
  }

  async tapMetaMetricsToggle() {
    await Gestures.waitAndTap(this.metaMetricsToggle);
  }
  async tapClearPrivacyData() {
    await Gestures.waitAndTap(this.clearPrivacyDataButton);
  }

  async tapTurnOnRememberMeToggle() {
    await Gestures.waitAndTap(this.rememberMeToggle);
  }

  async tapShowPrivateKeyButton() {
    await Gestures.waitAndTap(this.showPrivateKey);
  }
}

export default new SecurityAndPrivacy();
