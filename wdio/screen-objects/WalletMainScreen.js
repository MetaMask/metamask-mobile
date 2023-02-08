/* global driver */
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures.js';
import {
  WALLET_CONTAINER_ID,
} from './testIDs/Screens/WalletScreen-testIds.js';
import {
  ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
  ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
} from './testIDs/Components/OnboardingWizard.testIds';

import {
  WALLET_VIEW_BURGER_ICON_ID,
  HAMBURGER_MENU_BUTTON,
  IMPORT_NFT_BUTTON_ID,
  IMPORT_TOKEN_BUTTON_ID,
  WALLET_ACCOUNT_ICON,
  MAIN_WALLET_VIEW_VIA_TOKENS_ID,
  NAVBAR_NETWORK_BUTTON,
  NOTIFICATION_REMIND_ME_LATER_BUTTON_ID,
  SECURE_WALLET_BACKUP_ALERT_MODAL,
} from './testIDs/Screens/WalletView.testIds';

import { DRAWER_VIEW_SETTINGS_TEXT_ID } from './testIDs/Screens/DrawerView.testIds';

class WalletMainScreen {
  get wizardContainer() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
    );
  }

  get noThanks() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
    );
  }

  get burgerIcon() {
    return Selectors.getElementByPlatform(WALLET_VIEW_BURGER_ICON_ID);
  }

  get ImportToken() {
    return Selectors.getElementByPlatform(IMPORT_TOKEN_BUTTON_ID);
  }

  get ImportNFT() {
    return Selectors.getElementByPlatform(IMPORT_NFT_BUTTON_ID);
  }

  get HamburgerButton() {
    return Selectors.getElementByPlatform(HAMBURGER_MENU_BUTTON);
  }
  get Identicon() {
    return Selectors.getElementByPlatform(WALLET_ACCOUNT_ICON);
  }

  get WalletScreenContainer() {
    return Selectors.getXpathElementByResourceId(WALLET_CONTAINER_ID);
  }

  get networkInNavBar() {
    return Selectors.getElementByPlatform(NAVBAR_NETWORK_BUTTON);
  }

  get drawerSettings() {
    return Selectors.getElementByPlatform(DRAWER_VIEW_SETTINGS_TEXT_ID);
  }

  get mainWalletView() {
    return Selectors.getElementByPlatform(MAIN_WALLET_VIEW_VIA_TOKENS_ID);
  }

  get remindMeLaterNotification() {
    return Selectors.getElementByPlatform(
      NOTIFICATION_REMIND_ME_LATER_BUTTON_ID,
    );
  }

  get backupAlertModal() {
    return Selectors.getElementByPlatform(SECURE_WALLET_BACKUP_ALERT_MODAL);
  }

  async tapSettings() {
    await Gestures.tap(this.drawerSettings);
  }

  async tapSendIcon(text) {
    await Gestures.tapTextByXpath(text);
  }

  async tapNoThanks() {
    await Gestures.waitAndTap(this.noThanks);
  }

  async tapBurgerIcon() {
    await Gestures.waitAndTap(this.burgerIcon);
  }

  async tapBurgerButton() {
    await Gestures.tap(this.HamburgerButton);
  }

  async tapImportTokensButton() {
    await Gestures.waitAndTap(this.ImportToken);
  }

  async tapImportNFTButton() {
    await Gestures.swipe({ x: 100, y: 500 }, { x: 100, y: 10 });
    await Gestures.waitAndTap(this.ImportNFT);
  }

  async tapBurgerButtonByXpath() {
    await Gestures.tap(
      await Selectors.getXpathElementByContentDescription(this.HamburgerButton),
    );
  }

  async tapNFTTab() {
    await Gestures.tapTextByXpath('NFTs');
  }
  async tapIdenticon() {
    await Gestures.waitAndTap(this.Identicon);
  }

  async tapNetworkNavBar() {
    const timeOut = 3000;
    await driver.pause(timeOut);
    await Gestures.tap(this.networkInNavBar);
    await driver.pause(timeOut);
  }

  async tapRemindMeLaterOnNotification() {
    await Gestures.tap(this.remindMeLaterNotification, 'MOVETO');
    await Gestures.tap(this.remindMeLaterNotification);
  }

  async backupAlertModalIsVisible() {
    const element = await this.backupAlertModal;
    return element.isDisplayed();
  }
  async isVisible() {
    const element = await this.WalletScreenContainer;
    await element.waitForDisplayed();
  }

  async isNetworkNameCorrect(network) {
    const networkName = Selectors.getXpathElementByText(network);
    await expect(networkName).toBeDisplayed();
  }

  async isTokenTextVisible(token) {
    const tokenText = Selectors.getXpathElementByText(token);
    await expect(tokenText).toBeDisplayed();
  }

  async isOnboardingWizardVisible() {
    await expect(this.wizardContainer).toBeDisplayed();
  }

  async isMainWalletViewVisible() {
    await expect(this.mainWalletView).toBeDisplayed();
  }
}

export default new WalletMainScreen();
