import { AccountsMenuSelectorsIDs } from '../../../app/components/Views/AccountsMenu/AccountsMenu.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { type AppiumElement } from '../../framework';

class AccountMenu {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID,
    );
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.BACK_BUTTON);
  }

  get settingsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.SETTINGS);
  }

  get contactsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.CONTACTS);
  }

  get manageCardButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.MANAGE_CARD);
  }

  get permissionsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.PERMISSIONS);
  }

  get aboutMetaMaskButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.ABOUT_METAMASK);
  }

  get requestFeatureButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.REQUEST_FEATURE);
  }

  get supportButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.SUPPORT);
  }

  get lockButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.LOCK);
  }

  async tapBack(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button',
    });
  }

  async tapSettings(): Promise<void> {
    await Gestures.waitAndTap(this.settingsButton, {
      elemDescription: 'Settings button',
    });
  }

  async tapContacts(): Promise<void> {
    await Gestures.waitAndTap(this.contactsButton, {
      elemDescription: 'Contacts button',
    });
  }

  async tapManageCard(): Promise<void> {
    await Gestures.waitAndTap(this.manageCardButton, {
      elemDescription: 'Manage wallet button',
    });
  }

  async tapPermissions(): Promise<void> {
    await Gestures.waitAndTap(this.permissionsButton, {
      elemDescription: 'Permissions button',
    });
  }

  async tapAboutMetaMask(): Promise<void> {
    await Gestures.waitAndTap(this.aboutMetaMaskButton, {
      elemDescription: 'About MetaMask button',
    });
  }

  async tapRequestFeature(): Promise<void> {
    await Gestures.waitAndTap(this.requestFeatureButton, {
      elemDescription: 'Request a feature button',
    });
  }

  async tapSupport(): Promise<void> {
    await Gestures.waitAndTap(this.supportButton, {
      elemDescription: 'Support button',
    });
  }

  get notificationsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      AccountsMenuSelectorsIDs.NOTIFICATIONS_BUTTON,
    );
  }

  async tapNotifications(): Promise<void> {
    await Gestures.waitAndTap(this.notificationsButton, {
      elemDescription: 'Notifications button',
    });
  }

  async tapLock(): Promise<void> {
    await Gestures.waitAndTap(this.lockButton, {
      elemDescription: 'Lock button',
    });
  }
}

export default new AccountMenu();
