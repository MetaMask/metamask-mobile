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

export default class SecurityAndPrivacy {
  static async tapChangePasswordButton() {
    await TestHelpers.tap(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_BUTTON,
    );
  }
  static async tapDeleteWalletButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(
        SECURITY_PRIVACY_DELETE_WALLET_BUTTON,
      );
    } else {
      await TestHelpers.waitAndTap(SECURITY_PRIVACY_DELETE_WALLET_BUTTON);
    }
  }
  static async tapBackButton() {
    await TestHelpers.tap(CommonSelectorsIDs.BACK_ARROW_BUTTON);
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
        SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_TITLE,
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
        SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_TITLE,
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

  static async tapOKAlertButton() {
    await TestHelpers.tapAlertWithButton('OK');
  }

  static async tapMetaMetricsToggle() {
    await TestHelpers.tap(SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH);
  }

  static async tapTurnOnRememberMeToggle() {
    await TestHelpers.tap(SECURITY_PRIVACY_REMEMBER_ME_TOGGLE);
  }

  static async isMetaMetricsToggleOn() {
    await TestHelpers.checkIfToggleIsOn(
      SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
    );
  }

  static async isMetaMetricsToggleOff() {
    await TestHelpers.checkIfToggleIsOff(
      SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
    );
  }

  static async isRememberMeToggleOn() {
    await TestHelpers.checkIfToggleIsOn(SECURITY_PRIVACY_REMEMBER_ME_TOGGLE);
  }

  static async isRememberMeToggleOff() {
    await TestHelpers.checkIfToggleIsOff(SECURITY_PRIVACY_REMEMBER_ME_TOGGLE);
  }

  static async isChangePasswordSectionVisible() {
    await TestHelpers.checkIfVisible(
      SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_TITLE,
    );
  }
}
