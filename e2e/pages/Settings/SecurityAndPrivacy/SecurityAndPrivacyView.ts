import { SECURITY_PRIVACY_DELETE_WALLET_BUTTON } from '../../../../wdio/screen-objects/testIDs/Screens/SecurityPrivacy.testIds';
import {
  SecurityPrivacyViewSelectorsIDs,
  SecurityPrivacyViewSelectorsText,
} from '../../../selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';

class SecurityAndPrivacy {
  get changePasswordButton(): DetoxElement {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_BUTTON,
    );
  }

  get revealSecretRecoveryPhraseButton(): DetoxElement {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.REVEAL_SEED_BUTTON,
    );
  }
  get clearPrivacyDataButton(): DetoxElement {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CLEAR_PRIVACY_DATA_BUTTON,
    );
  }

  get securityAndPrivacyHeading(): DetoxElement {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.SECURITY_AND_PRIVACY_HEADING,
    );
  }

  get deleteWalletButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(SECURITY_PRIVACY_DELETE_WALLET_BUTTON)
      : Matchers.getElementByLabel(SECURITY_PRIVACY_DELETE_WALLET_BUTTON);
  }

  get metaMetricsToggle(): DetoxElement {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
    );
  }
  get scrollViewIdentifier(): Promise<DetoxMatcher> {
    return Matchers.getIdentifier(
      SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
    );
  }

  get autoLockSection(): DetoxElement {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.AUTO_LOCK_SECTION,
    );
  }

  get autoLockDefault30Seconds(): DetoxElement {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.AUTO_LOCK_30_SECONDS,
    );
  }

  get rememberMeToggle(): DetoxElement {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.REMEMBER_ME_TOGGLE,
    );
  }

  get changePasswordSection(): DetoxElement {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER,
    );
  }

  get securitySettingsScroll(): DetoxElement {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
    );
  }
  get showPrivateKey(): DetoxElement {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.SHOW_PRIVATE_KEY,
    );
  }

  get showPrivateKeyButton(): DetoxElement {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.SHOW_PRIVATE_KEY,
    );
  }

  get backUpNow(): DetoxElement {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.BACK_UP_NOW,
    );
  }

  get privacyHeader(): DetoxElement {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.PRIVACY_HEADING,
    );
  }

  get clearBrowserCookiesButton(): DetoxElement {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.CLEAR_BROWSER_COOKIES,
    );
  }

  get revealPrivateKeyButton(): DetoxElement {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.SHOW_PRIVATE_KEY,
    );
  }

  async tapRevealSecretRecoveryPhraseButton(): Promise<void> {
    await Gestures.waitAndTap(this.revealSecretRecoveryPhraseButton, {
      elemDescription: 'Reveal secret recovery phrase button',
    });
  }

  async tapChangePasswordButton(): Promise<void> {
    await Gestures.waitAndTap(this.changePasswordButton, {
      elemDescription: 'Change password button',
    });
  }

  async tapDeleteWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.deleteWalletButton, {
      elemDescription: 'Delete wallet button',
    });
  }

  async scrollToRevealPrivateKey(): Promise<void> {
    await Gestures.scrollToElement(
      this.revealPrivateKeyButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Reveal private key button',
      },
    );
  }
  async scrollToChangePasswordView(): Promise<void> {
    await Gestures.scrollToElement(
      this.changePasswordButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Change password button',
      },
    );
  }

  async scrollToDeleteWalletButton(): Promise<void> {
    await Gestures.scrollToElement(
      this.deleteWalletButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Delete wallet button',
      },
    );
  }

  async scrollToTurnOnRememberMe(): Promise<void> {
    await Gestures.scrollToElement(
      this.rememberMeToggle,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Remember me toggle',
      },
    );
  }

  async scrollToClearPrivacyData(): Promise<void> {
    await Gestures.scrollToElement(
      this.clearPrivacyDataButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Clear privacy data button',
      },
    );
  }

  async scrollToMetaMetrics(): Promise<void> {
    await Gestures.scrollToElement(
      this.metaMetricsToggle,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Meta metrics toggle',
      },
    );
  }

  async scrollToAutoLockSection(): Promise<void> {
    await Gestures.scrollToElement(
      this.autoLockSection,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Auto lock section',
      },
    );
  }

  async scrollToChangePassword(): Promise<void> {
    await Gestures.scrollToElement(
      this.changePasswordButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Change password button',
      },
    );
  }

  async tapChangePassword(): Promise<void> {
    await Gestures.waitAndTap(this.changePasswordButton, {
      elemDescription: 'Change password button',
    });
  }

  async tapAutoLock30Seconds(): Promise<void> {
    await Gestures.waitAndTap(this.autoLockDefault30Seconds, {
      elemDescription: 'Auto lock 30 seconds',
    });
  }

  async tapMetaMetricsToggle(): Promise<void> {
    await Gestures.waitAndTap(this.metaMetricsToggle, {
      elemDescription: 'Meta metrics toggle',
    });
  }
  async tapClearPrivacyData(): Promise<void> {
    await Gestures.waitAndTap(this.clearPrivacyDataButton, {
      elemDescription: 'Clear privacy data button',
    });
  }

  async tapTurnOnRememberMeToggle(): Promise<void> {
    await Gestures.waitAndTap(this.rememberMeToggle, {
      elemDescription: 'Remember me toggle',
    });
  }

  async tapShowPrivateKeyButton(): Promise<void> {
    await Gestures.waitAndTap(this.showPrivateKey, {
      elemDescription: 'Show private key button',
    });
  }
}

export default new SecurityAndPrivacy();
