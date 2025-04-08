import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
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
    await Gestures.waitAndTap(this.generalSettingsButton);
  }

  async tapAdvancedTitle() {
    await Gestures.waitAndTap(this.advancedButton);
  }

  async tapContactsSettings() {
    await Gestures.waitAndTap(this.contactsSettingsButton);
  }

  async tapSecurityAndPrivacy() {
    await Gestures.waitAndTap(this.securityAndPrivacyButton);
  }

  async tapNetworks() {
    await Gestures.waitAndTap(this.networksButton);
  }

  async tapNotifications() {
    await Gestures.waitAndTap(this.notificationsButton);
  }

  async tapContacts() {
    await Gestures.waitAndTap(this.contactsSettingsButton);
  }

  async tapAesCryptoTestForm() {
    await Gestures.waitAndTap(this.aesCryptoTestForm);
  }

  async tapLock() {
    await this.scrollToLockButton();
    await Gestures.waitAndTap(this.lockSettingsButton);
  }
  async tapContactSupport() {
    await this.scrollToLockButton();
    await Gestures.waitAndTap(this.contactSupportButton);
  }

  async tapYesAlertButton() {
    await Gestures.tap(this.alertButton);
  }
}

export default new SettingsView();
