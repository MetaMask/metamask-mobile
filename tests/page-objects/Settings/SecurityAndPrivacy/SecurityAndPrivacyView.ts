import {
  SecurityPrivacyViewSelectorsIDs,
  SecurityPrivacyViewSelectorsText,
} from '../../../../app/components/Views/Settings/SecuritySettings/SecurityPrivacyView.testIds';
import Matchers from '../../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class SecurityAndPrivacy {
  get changePasswordButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_BUTTON,
        ),
    });
  }

  get revealSecretRecoveryPhraseButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SecurityPrivacyViewSelectorsIDs.REVEAL_SEED_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SecurityPrivacyViewSelectorsIDs.REVEAL_SEED_BUTTON,
        ),
    });
  }
  get clearPrivacyDataButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SecurityPrivacyViewSelectorsIDs.CLEAR_PRIVACY_DATA_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SecurityPrivacyViewSelectorsIDs.CLEAR_PRIVACY_DATA_BUTTON,
        ),
    });
  }

  get securityAndPrivacyHeading(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          SecurityPrivacyViewSelectorsText.SECURITY_AND_PRIVACY_HEADING,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SecurityPrivacyViewSelectorsText.SECURITY_AND_PRIVACY_HEADING,
        ),
    });
  }

  get deleteWalletButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(
          SecurityPrivacyViewSelectorsIDs.DELETE_WALLET_BUTTON,
        )
      : Matchers.getElementByLabel(
          SecurityPrivacyViewSelectorsIDs.DELETE_WALLET_BUTTON,
        );
  }

  get metaMetricsToggle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        ),
    });
  }
  get scrollViewIdentifier(): Promise<DetoxMatcher> {
    return Matchers.getIdentifier(
      SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
    );
  }

  get autoLockSection(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SecurityPrivacyViewSelectorsIDs.AUTO_LOCK_SECTION,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SecurityPrivacyViewSelectorsIDs.AUTO_LOCK_SECTION,
        ),
    });
  }

  get autoLockDefault30Seconds(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          SecurityPrivacyViewSelectorsText.AUTO_LOCK_30_SECONDS,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SecurityPrivacyViewSelectorsText.AUTO_LOCK_30_SECONDS,
        ),
    });
  }

  get rememberMeToggle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SecurityPrivacyViewSelectorsIDs.REMEMBER_ME_TOGGLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SecurityPrivacyViewSelectorsIDs.REMEMBER_ME_TOGGLE,
        ),
    });
  }

  get changePasswordSection(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER,
        ),
    });
  }

  get securitySettingsScroll(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
        ),
    });
  }
  get showPrivateKey(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          SecurityPrivacyViewSelectorsText.SHOW_PRIVATE_KEY,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SecurityPrivacyViewSelectorsText.SHOW_PRIVATE_KEY,
        ),
    });
  }

  get showPrivateKeyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          SecurityPrivacyViewSelectorsText.SHOW_PRIVATE_KEY,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SecurityPrivacyViewSelectorsText.SHOW_PRIVATE_KEY,
        ),
    });
  }

  get backUpNow(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(SecurityPrivacyViewSelectorsText.BACK_UP_NOW),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SecurityPrivacyViewSelectorsText.BACK_UP_NOW,
        ),
    });
  }

  get privacyHeader(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          SecurityPrivacyViewSelectorsText.PRIVACY_HEADING,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SecurityPrivacyViewSelectorsText.PRIVACY_HEADING,
        ),
    });
  }

  get clearBrowserCookiesButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          SecurityPrivacyViewSelectorsText.CLEAR_BROWSER_COOKIES,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SecurityPrivacyViewSelectorsText.CLEAR_BROWSER_COOKIES,
        ),
    });
  }

  async tapRevealSecretRecoveryPhraseButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.revealSecretRecoveryPhraseButton, {
      elemDescription: 'Reveal secret recovery phrase button',
    });
  }

  async tapChangePasswordButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.changePasswordButton, {
      elemDescription: 'Change password button',
    });
  }

  async tapDeleteWalletButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.deleteWalletButton, {
      elemDescription: 'Delete wallet button',
    });
  }

  async scrollToChangePasswordView(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.changePasswordButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Change password button',
      },
    );
  }

  async scrollToDeleteWalletButton(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.deleteWalletButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Delete wallet button',
      },
    );
  }

  async scrollToTurnOnRememberMe(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.rememberMeToggle,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Remember me toggle',
      },
    );
  }

  async scrollToClearPrivacyData(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.clearPrivacyDataButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Clear privacy data button',
      },
    );
  }

  async scrollToMetaMetrics(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.metaMetricsToggle,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Meta metrics toggle',
      },
    );
  }

  async scrollToAutoLockSection(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.autoLockSection,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Auto lock section',
      },
    );
  }

  async scrollToChangePassword(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.changePasswordButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Change password button',
      },
    );
  }

  async tapChangePassword(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.changePasswordButton, {
      elemDescription: 'Change password button',
    });
  }

  async tapAutoLock30Seconds(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.autoLockDefault30Seconds, {
      elemDescription: 'Auto lock 30 seconds',
    });
  }

  async tapMetaMetricsToggle(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.metaMetricsToggle, {
      elemDescription: 'Meta metrics toggle',
    });
  }
  async tapClearPrivacyData(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.clearPrivacyDataButton, {
      elemDescription: 'Clear privacy data button',
    });
  }

  async tapTurnOnRememberMeToggle(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.rememberMeToggle, {
      elemDescription: 'Remember me toggle',
    });
  }

  async tapShowPrivateKeyButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.showPrivateKey, {
      elemDescription: 'Show private key button',
    });
  }
}

export default new SecurityAndPrivacy();
