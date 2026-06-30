import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { PlatformDetector } from '../../framework/PlatformLocator';
import {
  SettingsViewSelectorsIDs,
  SettingsViewSelectorsText,
} from '../../../app/components/Views/Settings/SettingsView.testIds';
import { CommonSelectorsText } from '../../../app/util/Common.testIds';
import { EncapsulatedElementType } from '../../framework';

class SettingsView {
  get title(): EncapsulatedElementType {
    return Matchers.getElementByText(SettingsViewSelectorsText.TITLE);
  }

  get generalSettingsButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.GENERAL);
  }

  get advancedButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.ADVANCED);
  }

  get contactsSettingsButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.CONTACTS);
  }

  get securityAndPrivacyButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.SECURITY);
  }

  get notificationsButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.NOTIFICATIONS);
  }

  get aesCryptoTestForm(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SettingsViewSelectorsIDs.AES_CRYPTO_TEST_FORM,
    );
  }

  get lockSettingsButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.LOCK);
  }
  get contactSupportButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.CONTACT);
  }

  get contactSupportSectionTitle(): EncapsulatedElementType {
    return Matchers.getElementByText(
      SettingsViewSelectorsText.CONTACT_SUPPORT_TITLE,
    );
  }

  get backupAndSyncSectionButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.BACKUP_AND_SYNC);
  }

  get snapsSectionButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.SNAPS);
  }

  get alertButton(): EncapsulatedElementType {
    return PlatformDetector.isAndroid()
      ? Matchers.getElementByText(CommonSelectorsText.YES_ALERT_BUTTON)
      : Matchers.getElementByLabel(CommonSelectorsText.YES_ALERT_BUTTON);
  }

  get scrollViewIdentifier(): Promise<DetoxMatcher> {
    return Matchers.getIdentifier(SettingsViewSelectorsIDs.SETTINGS_SCROLL_ID);
  }

  async scrollToLockButton(): Promise<void> {
    await Gestures.scrollToElement(
      this.lockSettingsButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Scroll to Lock Button',
      },
    );
  }

  async scrollToContactSupportButton(): Promise<void> {
    await Gestures.scrollToElement(
      this.contactSupportButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Scroll to Contact Support Button',
      },
    );
  }

  async scrollToAesCryptoButton(): Promise<void> {
    await Gestures.scrollToElement(
      this.aesCryptoTestForm,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Scroll to AES Crypto Test Form Button',
      },
    );
  }

  async tapGeneralSettings(): Promise<void> {
    await Gestures.waitAndTap(this.generalSettingsButton, {
      elemDescription: 'Settings - General Settings Button',
    });
  }

  async tapAdvancedTitle(): Promise<void> {
    await Gestures.waitAndTap(this.advancedButton, {
      elemDescription: 'Settings - Advanced Settings Button',
    });
  }

  async tapContactsSettings(): Promise<void> {
    await Gestures.waitAndTap(this.contactsSettingsButton, {
      elemDescription: 'Settings - Contacts Settings Button',
    });
  }

  async tapSecurityAndPrivacy(): Promise<void> {
    await Gestures.waitAndTap(this.securityAndPrivacyButton, {
      elemDescription: 'Settings - Security and Privacy Button',
    });
  }

  async tapNotifications(): Promise<void> {
    await Gestures.waitAndTap(this.notificationsButton, {
      elemDescription: 'Settings - Notifications Button',
    });
  }

  async tapContacts(): Promise<void> {
    await Gestures.waitAndTap(this.contactsSettingsButton, {
      elemDescription: 'Settings - Contacts Settings Button',
    });
  }

  async tapAesCryptoTestForm(): Promise<void> {
    await Gestures.waitAndTap(this.aesCryptoTestForm, {
      elemDescription: 'Settings - AES Crypto Test Form Button',
    });
  }

  async tapLock(): Promise<void> {
    await this.scrollToLockButton();
    await Gestures.waitAndTap(this.lockSettingsButton, {
      elemDescription: 'Settings - Lock Settings Button',
    });
  }
  async tapContactSupport(): Promise<void> {
    await this.scrollToLockButton();
    await Gestures.waitAndTap(this.contactSupportButton, {
      elemDescription: 'Settings - Contact Support Button',
    });
  }

  async tapYesAlertButton(): Promise<void> {
    await Gestures.waitAndTap(this.alertButton, {
      elemDescription: 'Settings - Alert Yes Button',
      timeout: 30_000,
      delay: 0,
      checkEnabled: false,
    });
  }

  async tapBackupAndSync(): Promise<void> {
    await Gestures.tap(this.backupAndSyncSectionButton, {
      elemDescription: 'Settings - Backup and Sync Section Button',
    });
  }

  get developerOptionsButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.DEVELOPER_OPTIONS);
  }

  async scrollToDeveloperOptions() {
    await Gestures.scrollToElement(
      this.developerOptionsButton,
      this.scrollViewIdentifier,
    );
  }

  async tapDeveloperOptions() {
    await Gestures.waitAndTap(this.developerOptionsButton);
  }

  async tapSnaps(): Promise<void> {
    await Gestures.scrollToElement(
      this.snapsSectionButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Scroll to Snaps Button',
      },
    );

    await Gestures.tap(this.snapsSectionButton, {
      elemDescription: 'Settings - Snaps Button',
    });
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.BACK_BUTTON);
  }

  async tapBackButton(): Promise<void> {
    await Gestures.tap(this.backButton, {
      elemDescription: 'Settings - Back Button',
    });
  }
}

export default new SettingsView();
