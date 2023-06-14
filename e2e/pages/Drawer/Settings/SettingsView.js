import TestHelpers from '../../../helpers';
import {
  CONTACTS_SETTINGS,
  GENERAL_SETTINGS,
  LOCK_SETTINGS,
  NETWORKS_SETTINGS,
  SECURITY_SETTINGS,
} from '../../../../wdio/screen-objects/testIDs/Screens/Settings.testIds';

const ANDROID_BACK_BUTTON_ON_SETTINGS_PAGE_ID = 'nav-android-back';
export default class SettingsView {
  static async tapGeneral() {
    await TestHelpers.waitAndTap(GENERAL_SETTINGS);
  }

  static async tapContacts() {
    await TestHelpers.waitAndTap(CONTACTS_SETTINGS);
  }

  static async tapSecurityAndPrivacy() {
    await TestHelpers.waitAndTap(SECURITY_SETTINGS);
  }

  static async tapNetworks() {
    await TestHelpers.waitAndTap(NETWORKS_SETTINGS);
  }

  static async tapLock() {
    await TestHelpers.swipe(LOCK_SETTINGS, 'up', 'fast');
    await TestHelpers.waitAndTap(LOCK_SETTINGS);
  }

  static async tapYesAlertButton() {
    await TestHelpers.tapAlertWithButton('YES'); // Do you really want to log out modal
  }

  static async tapCloseButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.tap(ANDROID_BACK_BUTTON_ON_SETTINGS_PAGE_ID);
    } else {
      await TestHelpers.tapByText('Close');
    }
  }
}
