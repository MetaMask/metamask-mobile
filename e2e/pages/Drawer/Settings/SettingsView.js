import TestHelpers from '../../../helpers';
import {
  CONTACTS_SETTINGS,
  GENERAL_SETTINGS,
  LOCK_SETTINGS,
  NETWORKS_SETTINGS,
  SECURITY_SETTINGS,
} from '../../../../wdio/screen-objects/testIDs/Screens/Settings.testIds';

import messages from '../../../../locales/languages/en.json';

const ADVANCE_TITLE_TEXT = messages.app_settings.advanced_title;

export default class SettingsView {
  static async tapGeneral() {
    await TestHelpers.waitAndTap(GENERAL_SETTINGS);
  }

  static async tapAdvanced() {
    await TestHelpers.tapByText(ADVANCE_TITLE_TEXT);
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
    await TestHelpers.swipe(CONTACTS_SETTINGS, 'up', 'fast');
    await TestHelpers.waitAndTap(LOCK_SETTINGS);
  }

  static async tapYesAlertButton() {
    await TestHelpers.tapAlertWithButton('YES'); // Do you really want to log out modal
  }
}
