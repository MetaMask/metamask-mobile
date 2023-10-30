import TestHelpers from '../../../helpers';
import {
  CONTACTS_SETTINGS,
  LOCK_SETTINGS,
  NETWORKS_SETTINGS,
  SECURITY_SETTINGS,
} from '../../../../wdio/screen-objects/testIDs/Screens/Settings.testIds';

export default class SettingsView {
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
    await TestHelpers.swipe(CONTACTS_SETTINGS, 'up', 'fast');
    await TestHelpers.waitAndTap(LOCK_SETTINGS);
  }

  static async tapYesAlertButton() {
    await TestHelpers.tapAlertWithButton('YES'); // Do you really want to log out modal
  }
}
