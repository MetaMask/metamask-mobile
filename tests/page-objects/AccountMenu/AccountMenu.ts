import { AccountsMenuSelectorsIDs } from '../../../app/components/Views/AccountsMenu/AccountsMenu.testIds';
import Matchers from '../../../tests/framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../tests/framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../tests/framework/PlaywrightMatchers';
import UnifiedGestures from '../../../tests/framework/UnifiedGestures';

class AccountMenu {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID,
        ),
    });
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountsMenuSelectorsIDs.BACK_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountsMenuSelectorsIDs.BACK_BUTTON),
    });
  }

  get settingsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AccountsMenuSelectorsIDs.SETTINGS),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountsMenuSelectorsIDs.SETTINGS),
    });
  }

  get contactsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AccountsMenuSelectorsIDs.CONTACTS),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountsMenuSelectorsIDs.CONTACTS),
    });
  }

  get manageCardButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountsMenuSelectorsIDs.MANAGE_CARD),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountsMenuSelectorsIDs.MANAGE_CARD),
    });
  }

  get permissionsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountsMenuSelectorsIDs.PERMISSIONS),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountsMenuSelectorsIDs.PERMISSIONS),
    });
  }

  get aboutMetaMaskButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountsMenuSelectorsIDs.ABOUT_METAMASK),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountsMenuSelectorsIDs.ABOUT_METAMASK,
        ),
    });
  }

  get requestFeatureButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountsMenuSelectorsIDs.REQUEST_FEATURE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountsMenuSelectorsIDs.REQUEST_FEATURE,
        ),
    });
  }

  get supportButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AccountsMenuSelectorsIDs.SUPPORT),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountsMenuSelectorsIDs.SUPPORT),
    });
  }

  get lockButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AccountsMenuSelectorsIDs.LOCK),
      appium: () =>
        PlaywrightMatchers.getElementById(AccountsMenuSelectorsIDs.LOCK),
    });
  }

  async tapBack(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button',
    });
  }

  async tapSettings(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.settingsButton, {
      elemDescription: 'Settings button',
    });
  }

  async tapContacts(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.contactsButton, {
      elemDescription: 'Contacts button',
    });
  }

  async tapManageCard(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.manageCardButton, {
      elemDescription: 'Manage wallet button',
    });
  }

  async tapPermissions(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.permissionsButton, {
      elemDescription: 'Permissions button',
    });
  }

  async tapAboutMetaMask(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.aboutMetaMaskButton, {
      elemDescription: 'About MetaMask button',
    });
  }

  async tapRequestFeature(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.requestFeatureButton, {
      elemDescription: 'Request a feature button',
    });
  }

  async tapSupport(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.supportButton, {
      elemDescription: 'Support button',
    });
  }

  get notificationsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(AccountsMenuSelectorsIDs.NOTIFICATIONS_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          AccountsMenuSelectorsIDs.NOTIFICATIONS_BUTTON,
        ),
    });
  }

  async tapNotifications(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.notificationsButton, {
      elemDescription: 'Notifications button',
    });
  }

  async tapLock(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.lockButton, {
      elemDescription: 'Lock button',
    });
  }
}

export default new AccountMenu();
