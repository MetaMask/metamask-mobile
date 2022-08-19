import TestHelpers from '../../../helpers';

const ANDROID_BACK_BUTTON_ON_SETTINGS_PAGE_ID = 'nav-android-back';
export default class SettingsView {
  static async tapGeneral() {
    await TestHelpers.tapByText('General');
  }

  static async tapContacts() {
    await TestHelpers.tapByText('Contacts');
  }

  static async tapSecurityAndPrivacy() {
    await TestHelpers.tapByText('Security & Privacy');
  }

  static async tapNetworks() {
    await TestHelpers.tapByText('Networks');
  }

  static async tapCloseButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.tap(ANDROID_BACK_BUTTON_ON_SETTINGS_PAGE_ID);
    } else {
      await TestHelpers.tapByText('Close');
    }
  }
}
