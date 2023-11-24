import TestHelpers from '../../../../helpers';
import {
  SECURITY_PRIVACY_REMEMBER_ME_TOGGLE,
  SECURITY_PRIVACY_DELETE_WALLET_BUTTON,
} from '../../../../../wdio/screen-objects/testIDs/Screens/SecurityPrivacy.testIds';
import { CommonSelectorsIDs } from '../../../../selectors/Common.selectors';
import {
  SecurityPrivacyViewSelectorsIDs,
  SecurityPrivacyViewSelectorsText,
} from '../../../../selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';

import Matchers from '../../../../utils/Matchers';
import Gestures from '../../../../utils/Gestures';

export default class SecurityAndPrivacy {
  static get container() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER,
    );
  }

  static get changePasswordButton() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_BUTTON,
    );
  }

  static get deleteWalletButtonLabel() {
    return Matchers.getElementByLabel(SECURITY_PRIVACY_DELETE_WALLET_BUTTON);
  }

  static get deleteWalletButtonID() {
    return Matchers.getElementByID(SECURITY_PRIVACY_DELETE_WALLET_BUTTON);
  }

  static get backButton() {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  static get metaMetricsToggle() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
    );
  }

  static get rememberMeToggle() {
    return Matchers.getElementByID(SECURITY_PRIVACY_REMEMBER_ME_TOGGLE);
  }

  static get changePasswordSection() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER,
    );
  }

  static get securitySettingsScroll() {
    return Matchers.getElementByID(
      SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
    );
  }

  static get backUpNow() {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.BACK_UP_NOW,
    );
  }

  static get privacyHeader() {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.PRIVACY_HEADING,
    );
  }

  static get clearBrowserCookiesButton() {
    return Matchers.getElementByText(
      SecurityPrivacyViewSelectorsText.CLEAR_BROWSER_COOKIES,
    );
  }

  static async tapChangePasswordButton() {
    await Gestures.waitAndTap(this.changePasswordButton);
  }

  static async tapDeleteWalletButton() {
    if (device.getPlatform() === 'android') {
      await Gestures.waitAndTap(this.deleteWalletButtonLabel);
    } else {
      await Gestures.waitAndTap(this.deleteWalletButtonID);
    }
  }

  static async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }

  static async scrollToChangePasswordView() {
    // Scroll to the bottom
    if (device.getPlatform() === 'android') {
      await Gestures.swipe(this.securitySettingsScroll, 'up', 'slow');
      await TestHelpers.delay(1000);
    } else {
      await Gestures.swipe(this.container, 'up', 'slow', 0.2);
    }
  }
  static async scrollToDeleteWalletButton() {
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

  static async scrollToTurnOnRememberMe() {
    // Scroll to the bottom
    if (device.getPlatform() === 'android') {
      await Gestures.swipe(this.securitySettingsScroll, 'up', 'slow');
      await TestHelpers.delay(1000);
    } else {
      await Gestures.swipe(this.container, 'up', 'slow', 0.6);
    }
    //await TestHelpers.swipe(PRIVACY_MODE_SECTION_ID, 'up', 'fast');
  }

  static async scrollToMetaMetrics() {
    await Gestures.swipe(this.backUpNow, 'up', 'fast', 0.6);
    await TestHelpers.delay(1500);

    if (device.getPlatform() === 'android') {
      await Gestures.swipe(this.privacyHeader, 'up', 'slow');

      await Gestures.swipe(this.clearBrowserCookiesButton, 'up', 'slow', 0.5);

      await TestHelpers.delay(1000);
    } else {
      await Gestures.swipe(this.privacyHeader, 'up', 'slow');
    }
  }

  static async tapMetaMetricsToggle() {
    await Gestures.waitAndTap(this.metaMetricsToggle);
  }

  static async tapTurnOnRememberMeToggle() {
    await Gestures.waitAndTap(this.rememberMeToggle);
  }

  static async getMetaMetricsToggle() {
    return await this.metaMetricsToggle;
  }

  static async getRememberMeToggle() {
    return await this.rememberMeToggle;
  }

  static async getChangePasswordSection() {
    return await this.changePasswordSection;
  }
}
