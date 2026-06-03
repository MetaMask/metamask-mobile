import Matchers from '../../framework/Matchers';
import {
  SettingsViewSelectorsIDs,
  SettingsViewSelectorsText,
} from '../../../app/components/Views/Settings/SettingsView.testIds';
import { CommonSelectorsText } from '../../../app/util/Common.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SettingsView {
  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(SettingsViewSelectorsText.TITLE),
      appium: () =>
        PlaywrightMatchers.getElementByText(SettingsViewSelectorsText.TITLE),
    });
  }

  get generalSettingsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SettingsViewSelectorsIDs.GENERAL),
      appium: () =>
        PlaywrightMatchers.getElementById(SettingsViewSelectorsIDs.GENERAL),
    });
  }

  get advancedButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SettingsViewSelectorsIDs.ADVANCED),
      appium: () =>
        PlaywrightMatchers.getElementById(SettingsViewSelectorsIDs.ADVANCED),
    });
  }

  get contactsSettingsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SettingsViewSelectorsIDs.CONTACTS),
      appium: () =>
        PlaywrightMatchers.getElementById(SettingsViewSelectorsIDs.CONTACTS),
    });
  }

  get securityAndPrivacyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SettingsViewSelectorsIDs.SECURITY),
      appium: () =>
        PlaywrightMatchers.getElementById(SettingsViewSelectorsIDs.SECURITY),
    });
  }

  get notificationsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SettingsViewSelectorsIDs.NOTIFICATIONS),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SettingsViewSelectorsIDs.NOTIFICATIONS,
        ),
    });
  }

  get aesCryptoTestForm(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SettingsViewSelectorsIDs.AES_CRYPTO_TEST_FORM),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SettingsViewSelectorsIDs.AES_CRYPTO_TEST_FORM,
        ),
    });
  }

  get lockSettingsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SettingsViewSelectorsIDs.LOCK),
      appium: () =>
        PlaywrightMatchers.getElementById(SettingsViewSelectorsIDs.LOCK),
    });
  }
  get contactSupportButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SettingsViewSelectorsIDs.CONTACT),
      appium: () =>
        PlaywrightMatchers.getElementById(SettingsViewSelectorsIDs.CONTACT),
    });
  }

  get contactSupportSectionTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          SettingsViewSelectorsText.CONTACT_SUPPORT_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SettingsViewSelectorsText.CONTACT_SUPPORT_TITLE,
        ),
    });
  }

  get backupAndSyncSectionButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SettingsViewSelectorsIDs.BACKUP_AND_SYNC),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SettingsViewSelectorsIDs.BACKUP_AND_SYNC,
        ),
    });
  }

  get snapsSectionButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SettingsViewSelectorsIDs.SNAPS),
      appium: () =>
        PlaywrightMatchers.getElementById(SettingsViewSelectorsIDs.SNAPS),
    });
  }

  get alertButton(): DetoxElement {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByText(CommonSelectorsText.YES_ALERT_BUTTON)
      : Matchers.getElementByLabel(CommonSelectorsText.YES_ALERT_BUTTON);
  }

  get scrollViewIdentifier(): Promise<DetoxMatcher> {
    return Matchers.getIdentifier(SettingsViewSelectorsIDs.SETTINGS_SCROLL_ID);
  }

  async scrollToLockButton(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.lockSettingsButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Scroll to Lock Button',
      },
    );
  }

  async scrollToContactSupportButton(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.contactSupportButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Scroll to Contact Support Button',
      },
    );
  }

  async scrollToAesCryptoButton(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.aesCryptoTestForm,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Scroll to AES Crypto Test Form Button',
      },
    );
  }

  async tapGeneralSettings(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.generalSettingsButton, {
      elemDescription: 'Settings - General Settings Button',
    });
  }

  async tapAdvancedTitle(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.advancedButton, {
      elemDescription: 'Settings - Advanced Settings Button',
    });
  }

  async tapContactsSettings(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.contactsSettingsButton, {
      elemDescription: 'Settings - Contacts Settings Button',
    });
  }

  async tapSecurityAndPrivacy(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.securityAndPrivacyButton, {
      elemDescription: 'Settings - Security and Privacy Button',
    });
  }

  async tapNotifications(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.notificationsButton, {
      elemDescription: 'Settings - Notifications Button',
    });
  }

  async tapContacts(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.contactsSettingsButton, {
      elemDescription: 'Settings - Contacts Settings Button',
    });
  }

  async tapAesCryptoTestForm(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.aesCryptoTestForm, {
      elemDescription: 'Settings - AES Crypto Test Form Button',
    });
  }

  async tapLock(): Promise<void> {
    await this.scrollToLockButton();
    await UnifiedGestures.waitAndTap(this.lockSettingsButton, {
      elemDescription: 'Settings - Lock Settings Button',
    });
  }
  async tapContactSupport(): Promise<void> {
    await this.scrollToLockButton();
    await UnifiedGestures.waitAndTap(this.contactSupportButton, {
      elemDescription: 'Settings - Contact Support Button',
    });
  }

  async tapYesAlertButton(): Promise<void> {
    await UnifiedGestures.tap(this.alertButton, {
      elemDescription: 'Settings - Alert Yes Button',
    });
  }

  async tapBackupAndSync(): Promise<void> {
    await UnifiedGestures.tap(this.backupAndSyncSectionButton, {
      elemDescription: 'Settings - Backup and Sync Section Button',
    });
  }

  get developerOptionsButton() {
    return Matchers.getElementByID(SettingsViewSelectorsIDs.DEVELOPER_OPTIONS);
  }

  async scrollToDeveloperOptions() {
    await UnifiedGestures.scrollToElement(
      this.developerOptionsButton,
      this.scrollViewIdentifier,
    );
  }

  async tapDeveloperOptions() {
    await UnifiedGestures.waitAndTap(this.developerOptionsButton);
  }

  async tapSnaps(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.snapsSectionButton,
      this.scrollViewIdentifier,
      {
        elemDescription: 'Scroll to Snaps Button',
      },
    );

    await UnifiedGestures.tap(this.snapsSectionButton, {
      elemDescription: 'Settings - Snaps Button',
    });
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SettingsViewSelectorsIDs.BACK_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(SettingsViewSelectorsIDs.BACK_BUTTON),
    });
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.tap(this.backButton, {
      elemDescription: 'Settings - Back Button',
    });
  }
}

export default new SettingsView();
