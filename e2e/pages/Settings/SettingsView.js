import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import {
  SettingsViewSelectorsIDs,
  SettingsViewSelectorsText,
} from '../../selectors/Settings/SettingsView.selectors';
import { CommonSelectorsText } from '../../selectors/Common.selectors';

class SettingsView {
  get generalSettingsButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.GENERAL);
  }

  get advancedButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.ADVANCED);
  }

  get contactsSettingsButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.CONTACTS);
  }

  get securityAndPrivacyButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.SECURITY);
  }

  get networksButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.NETWORKS);
  }

  get notificationsButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.NOTIFICATIONS);
  }

  get aesCryptoTestForm() {
    return Matchers.getElementByID(
      SettingsViewSelectorsIDs.AES_CRYPTO_TEST_FORM,
    );
  }

  get lockSettingsButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.LOCK);
  }
  get contactSupportButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.CONTACT);
  }

  get contactSupportSectionTitle() {
    return Matchers.getElementByText(
      SettingsViewSelectorsText.CONTACT_SUPPORT_TITLE,
    );
  }

  get backupAndSyncSectionButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.BACKUP_AND_SYNC);
  }

  get alertButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByText(CommonSelectorsText.YES_ALERT_BUTTON)
      : Matchers.getElementByLabel(CommonSelectorsText.YES_ALERT_BUTTON);
  }

  get scrollViewIdentifier() {
    return Matchers.getIdentifier(SettingsViewSelectorsIDs.SETTINGS_SCROLL_ID);
  }

  async scrollToLockButton() {
    await Gestures.scrollToElement(
      this.lockSettingsButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToContactSupportButton() {
    await Gestures.scrollToElement(
      this.contactSupportButton,
      this.scrollViewIdentifier,
    );
  }

  async scrollToAesCryptoButton() {
    await Gestures.scrollToElement(
      this.aesCryptoTestForm,
      this.scrollViewIdentifier,
    );
  }

  async tapGeneralSettings() {
    await Gestures.waitAndTap(this.generalSettingsButton, {
      elemDescription: 'Settings - General Settings Button',
    });
  }

  async tapAdvancedTitle() {
    await Gestures.waitAndTap(this.advancedButton, {
      elemDescription: 'Settings - Advanced Settings Button',
    });
  }

  async tapContactsSettings() {
    await Gestures.waitAndTap(this.contactsSettingsButton, {
      elemDescription: 'Settings - Contacts Settings Button',
    });
  }

  async tapSecurityAndPrivacy() {
    await Gestures.waitAndTap(this.securityAndPrivacyButton, {
      elemDescription: 'Settings - Security and Privacy Button',
    });
  }

  async tapNetworks() {
    await Gestures.waitAndTap(this.networksButton, {
      elemDescription: 'Settings - Networks Button',
    });
  }

  async tapNotifications() {
    await Gestures.waitAndTap(this.notificationsButton, {
      elemDescription: 'Settings - Notifications Button',
    });
  }

  async tapContacts() {
    await Gestures.waitAndTap(this.contactsSettingsButton, {
      elemDescription: 'Settings - Contacts Settings Button',
    });
  }

  async tapAesCryptoTestForm() {
    await Gestures.waitAndTap(this.aesCryptoTestForm, {
      elemDescription: 'Settings - AES Crypto Test Form Button',
    });
  }

  async tapLock() {
    await this.scrollToLockButton();
    await Gestures.waitAndTap(this.lockSettingsButton, {
      elemDescription: 'Settings - Lock Settings Button',
    });
  }
  async tapContactSupport() {
    await this.scrollToLockButton();
    await Gestures.waitAndTap(this.contactSupportButton, {
      elemDescription: 'Settings - Contact Support Button',
    });
  }

  async tapYesAlertButton() {
    await Gestures.tap(this.alertButton, {
      elemDescription: 'Settings - Alert Yes Button',
    });
  }

  async tapBackupAndSync() {
    await Gestures.tap(this.backupAndSyncSectionButton, {
      elemDescription: 'Settings - Backup and Sync Section Button',
    });
  }
}

export default new SettingsView();
