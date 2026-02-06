import { AccountsMenuSelectorsIDs } from '../../../app/components/Views/AccountsMenu/AccountsMenu.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';

class AccountMenu {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      AccountsMenuSelectorsIDs.ACCOUNTS_MENU_SCROLL_ID,
    );
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.BACK_BUTTON);
  }

  get settingsButton(): DetoxElement {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.SETTINGS);
  }

  get contactsButton(): DetoxElement {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.CONTACTS);
  }

  get manageWalletButton(): DetoxElement {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.MANAGE_WALLET);
  }

  get permissionsButton(): DetoxElement {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.PERMISSIONS);
  }

  get aboutMetaMaskButton(): DetoxElement {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.ABOUT_METAMASK);
  }

  get requestFeatureButton(): DetoxElement {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.REQUEST_FEATURE);
  }

  get supportButton(): DetoxElement {
    return Matchers.getElementByID(AccountsMenuSelectorsIDs.SUPPORT);
  }

  get lockButton(): DetoxElement {
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

  async tapManageWallet(): Promise<void> {
    await Gestures.waitAndTap(this.manageWalletButton, {
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

  async tapLock(): Promise<void> {
    await Gestures.waitAndTap(this.lockButton, {
      elemDescription: 'Lock button',
    });
  }
}

export default new AccountMenu();
