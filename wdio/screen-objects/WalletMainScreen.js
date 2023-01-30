<<<<<<< HEAD
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures.js';
import {WALLET_CONTAINER_ID} from './testIDs/Screens/WalletScreen-testIds.js';
=======
/* global driver */
import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures.js';
import {
  WALLET_CONTAINER_ID,
  NAVBAR_TITLE_NETWORKS_TEXT,
} from './testIDs/Screens/WalletScreen-testIds.js';
>>>>>>> 7abbc1bfd (Merge main)
import {
  ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
  ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
} from './testIDs/Components/OnboardingWizard.testIds';

import {
<<<<<<< HEAD
  HAMBURGER_MENU_BUTTON,
  IMPORT_NFT_BUTTON_ID,
  IMPORT_TOKEN_BUTTON_ID,
  MAIN_WALLET_ACCOUNT_ACTIONS,
  MAIN_WALLET_VIEW_VIA_TOKENS_ID,
  NAVBAR_NETWORK_BUTTON,
  NAVBAR_NETWORK_TEXT,
  NOTIFICATION_REMIND_ME_LATER_BUTTON_ID,
  SECURE_WALLET_BACKUP_ALERT_MODAL,
  SHARE_ADDRESS,
  SHOW_PRIVATE_KEY,
  VIEW_ETHERSCAN,
  WALLET_ACCOUNT_ICON,
  WALLET_VIEW_BURGER_ICON_ID,
} from './testIDs/Screens/WalletView.testIds';

import {DRAWER_VIEW_SETTINGS_TEXT_ID} from './testIDs/Screens/DrawerView.testIds';

import {NOTIFICATION_TITLE} from './testIDs/Components/Notification.testIds';
import {TAB_BAR_WALLET_BUTTON} from './testIDs/Components/TabBar.testIds';
import {BACK_BUTTON_SIMPLE_WEBVIEW} from './testIDs/Components/SimpleWebView.testIds';
=======
  WALLET_VIEW_BURGER_ICON_ID,
  HAMBURGER_MENU_BUTTON,
  IMPORT_NFT_BUTTON_ID,
  IMPORT_TOKEN_BUTTON_ID,
  WALLET_ACCOUNT_ICON,
  MAIN_WALLET_VIEW_VIA_TOKENS_ID,
} from './testIDs/Screens/WalletView.testIds';

import { DRAWER_VIEW_SETTINGS_TEXT_ID } from './testIDs/Screens/DrawerView.testIds';
>>>>>>> 7abbc1bfd (Merge main)

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

<<<<<<< HEAD
  get TokenNotificationTitle() {
    return Selectors.getElementByPlatform(NOTIFICATION_TITLE);
  }

  get HamburgerButton() {
    return Selectors.getElementByPlatform(HAMBURGER_MENU_BUTTON);
  }

=======
  get HamburgerButton() {
    return Selectors.getElementByPlatform(HAMBURGER_MENU_BUTTON);
  }
>>>>>>> 7abbc1bfd (Merge main)
  get Identicon() {
    return Selectors.getElementByPlatform(WALLET_ACCOUNT_ICON);
  }

  get WalletScreenContainer() {
<<<<<<< HEAD
    return Selectors.getXpathElementByResourceId(WALLET_CONTAINER_ID);
  }

  get networkInNavBar() {
    return Selectors.getElementByPlatform(NAVBAR_NETWORK_BUTTON);
=======
    return Selectors.getElementByPlatform(WALLET_CONTAINER_ID);
  }

  get networkNavBarWalletTitle() {
    return Selectors.getElementByPlatform(NAVBAR_TITLE_NETWORKS_TEXT);
>>>>>>> 7abbc1bfd (Merge main)
  }

  get drawerSettings() {
    return Selectors.getElementByPlatform(DRAWER_VIEW_SETTINGS_TEXT_ID);
  }

  get mainWalletView() {
    return Selectors.getElementByPlatform(MAIN_WALLET_VIEW_VIA_TOKENS_ID);
  }

<<<<<<< HEAD
  get remindMeLaterNotification() {
    return Selectors.getElementByPlatform(
      NOTIFICATION_REMIND_ME_LATER_BUTTON_ID,
    );
  }

  get backupAlertModal() {
    return Selectors.getElementByPlatform(SECURE_WALLET_BACKUP_ALERT_MODAL);
  }

  get networkNavbarTitle() {
    return Selectors.getElementByPlatform(NAVBAR_NETWORK_TEXT);
  }

  get accountActionsButton() {
    return Selectors.getElementByPlatform(MAIN_WALLET_ACCOUNT_ACTIONS);
  }

  get privateKeyActionButton() {
    return Selectors.getElementByPlatform(SHOW_PRIVATE_KEY);
  }

  get shareAddressActionButton() {
    return Selectors.getElementByPlatform(SHARE_ADDRESS);
  }

  get viewEtherscanActionButton() {
    return Selectors.getElementByPlatform(VIEW_ETHERSCAN);
  }

  get walletButton() {
    return Selectors.getElementByPlatform(TAB_BAR_WALLET_BUTTON);
  }

  get goBackSimpleWebViewButton() {
    return Selectors.getElementByPlatform(BACK_BUTTON_SIMPLE_WEBVIEW);
  }

  async tapSettings() {
    await Gestures.waitAndTap(this.drawerSettings);
=======
  async tapSettings() {
    await Gestures.tap(this.drawerSettings);
>>>>>>> 7abbc1bfd (Merge main)
  }

  async tapSendIcon(text) {
    await Gestures.tapTextByXpath(text);
  }

  async tapNoThanks() {
    await Gestures.waitAndTap(this.noThanks);
  }

<<<<<<< HEAD
  async tapBurgerButton() {
    await Gestures.waitAndTap(this.HamburgerButton);
  }

  async tapImportTokensButton() {
    const importToken = await this.ImportToken;
    await importToken.waitForDisplayed();

    let displayed = true;
    while (displayed) {
      if (await importToken.isExisting()) {
        await importToken.click();
        await driver.pause(3000);
      } else {
        displayed = false;
      }
    }
  }

  async tapImportNFTButton() {
    await Gestures.swipe({x: 100, y: 500}, {x: 100, y: 10});
    await Gestures.waitAndTap(this.ImportNFT);
  }

  async tapNFTTab() {
    await Gestures.tapTextByXpath('NFTs');
  }

  async tapIdenticon() {
    await Gestures.waitAndTap(this.Identicon);
  }

  async tapNetworkNavBar() {
    await Gestures.waitAndTap(await this.networkInNavBar);
  }

  async tapRemindMeLaterOnNotification() {
    await Gestures.waitAndTap(await this.remindMeLaterNotification);
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
    const networkName = await Selectors.getXpathElementByTextContains(network);
    await networkName.waitForDisplayed();
  }

  async isTokenTextVisible(token) {
    const tokenText = await Selectors.getXpathElementByTextContains(token);
    await expect(tokenText).toBeDisplayed();
    await tokenText.waitForExist({reverse: true});
=======
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
    await Gestures.tap(this.Identicon);
  }

  async tapNetworkNavBar() {
    const timeOut = 3000;
    await driver.pause(timeOut);
    await Gestures.tap(this.networkNavBarWalletTitle);
    await driver.pause(timeOut);
  }

  async isVisible() {
    await expect(this.WalletScreenContainer).toBeDisplayed();
  }

  async isNetworkNameCorrect(network) {
    const textFromElement = await this.networkNavBarWalletTitle;
    const networkName = await textFromElement.getText();
    expect(networkName).toContain(network);
  }

  async isTokenTextVisible(token) {
    const tokenText = Selectors.getXpathElementByText(token);
    await expect(tokenText).toBeDisplayed();
>>>>>>> 7abbc1bfd (Merge main)
  }

  async isOnboardingWizardVisible() {
    await expect(this.wizardContainer).toBeDisplayed();
  }

  async isMainWalletViewVisible() {
<<<<<<< HEAD
    const element = await this.mainWalletView;
    await element.waitForDisplayed();
  }

  async waitForNotificationToDisplayed() {
    const element = await this.TokenNotificationTitle;
    await element.waitForDisplayed();
    await element.waitForExist({reverse: true});
  }

  async isToastNotificationDisplayed() {
    const element = await this.TokenNotificationTitle;
    await element.waitForDisplayed();
    expect(await element.getText()).toContain('Transaction');
    expect(await element.getText()).toContain('Complete!');
    await element.waitForExist({reverse: true});
  }

  async isNetworkNavbarTitle(text) {
    const element = await this.networkNavbarTitle;
    await expect(await element.getText()).toContain(text);
  }

  async tapAccountActions() {
    await Gestures.waitAndTap(this.accountActionsButton);
  }

  async tapShowPrivateKey() {
    await Gestures.waitAndTap(this.privateKeyActionButton);
    await Gestures.waitAndTap(this.walletButton);
  }

  async tapShareAddress() {
    await Gestures.waitAndTap(this.shareAddressActionButton);
  }

  async tapViewOnEtherscan() {
    await Gestures.waitAndTap(this.viewEtherscanActionButton);
    await Gestures.waitAndTap(this.goBackSimpleWebViewButton);
=======
    await expect(this.mainWalletView).toBeDisplayed();
>>>>>>> 7abbc1bfd (Merge main)
  }
}

export default new WalletMainScreen();
