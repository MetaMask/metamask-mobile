import TestHelpers from '../../../../helpers';
import {
  SECURITY_PRIVACY_REMEMBER_ME_TOGGLE,
  SECURITY_PRIVACY_DELETE_WALLET_BUTTON,
} from '../../../../../wdio/screen-objects/testIDs/Screens/SecurityPrivacy.testIds';
import {
  SecurityPrivacyViewSelectorsIDs,
  SecurityPrivacyViewSelectorsText,
} from '../../../../selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import Matchers from '../../../../utils/Matchers';
import Gestures from '../../../../utils/Gestures';

class SecurityAndPrivacy {
  get container() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER,
    );
  }

  get changePasswordButton() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_BUTTON,
    );
  }

  get deleteWalletButtonLabel() {
    return Matchers.getElementByLabel(SECURITY_PRIVACY_DELETE_WALLET_BUTTON);
  }

  get deleteWalletButtonID() {
    return Matchers.getElementByID(SECURITY_PRIVACY_DELETE_WALLET_BUTTON);
  }

  get metaMetricsToggle() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
    );
  }

  get rememberMeToggle() {
    return Matchers.getElementByID(SECURITY_PRIVACY_REMEMBER_ME_TOGGLE);
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

  async tapChangePasswordButton() {
    await Gestures.waitAndTap(this.changePasswordButton);
  }

  async tapDeleteWalletButton() {
    if (device.getPlatform() === 'android') {
      await Gestures.waitAndTap(this.deleteWalletButtonLabel);
    } else {
      await Gestures.waitAndTap(this.deleteWalletButtonID);
    }
  }

  async scrollToChangePasswordView() {
    // Scroll to the bottom
    if (device.getPlatform() === 'android') {
      await Gestures.swipe(this.securitySettingsScroll, 'up', 'slow');
      await TestHelpers.delay(1000);
    } else {
      await Gestures.swipe(this.container, 'up', 'slow', 0.2);
    }
  }

  async scrollToDeleteWalletButton() {
    // Scroll to the bottom
    await Gestures.swipe(this.securitySettingsScroll, 'up', 'fast', 0.6);
    await TestHelpers.delay(1500);

    if (device.getPlatform() === 'android') {
      await Gestures.swipe(this.securitySettingsScroll, 'up', 'slow', 0.7);
      await TestHelpers.delay(3500);
    } else {
      await Gestures.swipe(this.securitySettingsScroll, 'up', 'fast', 0.6);
      await TestHelpers.delay(3500);
    }
  }

  async scrollToTurnOnRememberMe() {
    // Scroll to the bottom
    if (device.getPlatform() === 'android') {
      await Gestures.swipe(this.securitySettingsScroll, 'up', 'slow');
      await TestHelpers.delay(1000);
    } else {
      await Gestures.swipe(this.container, 'up', 'slow', 0.6);
    }
    //await TestHelpers.swipe(PRIVACY_MODE_SECTION_ID, 'up', 'fast');
  }

  async scrollToMetaMetrics() {
    await Gestures.swipe(this.backUpNow, 'up', 'fast', 0.6);
    await TestHelpers.delay(1500);

    if (device.getPlatform() === 'android') {
      await Gestures.swipeAtIndex(this.privacyHeader, 'up', 'slow');

      await Gestures.swipeAtIndex(
        this.clearBrowserCookiesButton,
        'up',
        'slow',
        0.5,
      );

      await TestHelpers.delay(1000);
    } else {
      await Gestures.swipeAtIndex(this.privacyHeader, 'up', 'slow');
    }
  }

  async tapMetaMetricsToggle() {
    await Gestures.waitAndTap(this.metaMetricsToggle);
  }

  async tapTurnOnRememberMeToggle() {
    await Gestures.waitAndTap(this.rememberMeToggle);
  }
}

export default new SecurityAndPrivacy();
