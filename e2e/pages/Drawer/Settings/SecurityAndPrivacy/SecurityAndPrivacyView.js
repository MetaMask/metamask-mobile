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

  static async tapChangePasswordButton() {
    await Gestures.tap(this.changePasswordButton);
  }

  static async tapDeleteWalletButton() {
    if (device.getPlatform() === 'android') {
      await Gestures.waitAndTap(this.deleteWalletButtonLabel);
    } else {
      await Gestures.waitAndTap(this.deleteWalletButtonID);
    }
  }

  static async tapBackButton() {
    await Gestures.tap(this.backButton);
  }

  static async scrollToChangePasswordView() {
    // Scroll to the bottom
    if (device.getPlatform() === 'android') {
      await TestHelpers.swipe(
        SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
        'up',
        'slow',
      );
      await TestHelpers.delay(1000);
    } else {
      await TestHelpers.swipe(
        SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER,
        'up',
        'slow',
        0.2,
      );
    }
  }
  static async scrollToDeleteWalletButton() {
    // Scroll to the bottom
    await TestHelpers.swipe(
      SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
      'up',
      'fast',
      0.6,
    );
    await TestHelpers.delay(1500);

    if (device.getPlatform() === 'android') {
      await TestHelpers.swipe(
        SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
        'up',
        'slow',
        0.7,
      );
      await TestHelpers.delay(3500);
    } else {
      await TestHelpers.swipe(
        SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
        'up',
        'fast',
        0.6,
      );
      await TestHelpers.delay(3500);
    }
  }

  static async scrollToTurnOnRememberMe() {
    // Scroll to the bottom
    if (device.getPlatform() === 'android') {
      await TestHelpers.swipe(
        SecurityPrivacyViewSelectorsIDs.SECURITY_SETTINGS_SCROLL,
        'up',
        'slow',
      );
      await TestHelpers.delay(1000);
    } else {
      await TestHelpers.swipe(
        SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER,
        'up',
        'slow',
        0.6,
      );
    }
    //await TestHelpers.swipe(PRIVACY_MODE_SECTION_ID, 'up', 'fast');
  }

  static async scrollToMetaMetrics() {
    await TestHelpers.swipeByText(
      SecurityPrivacyViewSelectorsText.BACK_UP_NOW,
      'up',
      'fast',
      0.6,
    );
    await TestHelpers.delay(1500);

    if (device.getPlatform() === 'android') {
      await TestHelpers.swipeByText(
        SecurityPrivacyViewSelectorsText.PRIVACY_HEADING,
        'up',
        'slow',
      );

      await TestHelpers.swipeByText(
        SecurityPrivacyViewSelectorsText.CLEAR_BROWSER_COOKIES,
        'up',
        'slow',
        0.5,
      );

      await TestHelpers.delay(1000);
    } else {
      await TestHelpers.swipeByText(
        SecurityPrivacyViewSelectorsText.PRIVACY_HEADING,
        'up',
        'slow',
      );
    }
  }

  static async tapMetaMetricsToggle() {
    await Gestures.tap(this.metaMetricsToggle);
  }

  static async tapTurnOnRememberMeToggle() {
    await Gestures.tap(this.rememberMeToggle);
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
