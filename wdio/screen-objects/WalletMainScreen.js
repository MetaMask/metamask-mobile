import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures.js';
import { WALLET_CONTAINER_ID } from './testIDs/Screens/WalletScreen-testIds.js';
import {
  ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
  ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
} from './testIDs/Components/OnboardingWizard.testIds';

import {
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

import { NOTIFICATION_TITLE } from './testIDs/Components/Notification.testIds';
import { TAB_BAR_WALLET_BUTTON } from './testIDs/Components/TabBar.testIds';
import { BACK_BUTTON_SIMPLE_WEBVIEW } from './testIDs/Components/SimpleWebView.testIds';

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

  get TokenNotificationTitle() {
    return Selectors.getElementByPlatform(NOTIFICATION_TITLE);
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

  async tapSendIcon(text) {
    await Gestures.tapTextByXpath(text);
  }

  async tapNoThanks() {
    await Gestures.waitAndTap(this.noThanks);
  }

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
    await Gestures.swipe({ x: 100, y: 500 }, { x: 100, y: 10 });
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
    await tokenText.waitForExist({ reverse: true });
  }

  async isOnboardingWizardVisible() {
    await expect(this.wizardContainer).toBeDisplayed();
  }

  async isMainWalletViewVisible() {
    const element = await this.mainWalletView;
    await element.waitForDisplayed(2500);
  }

  async waitForNotificationToDisplayed() {
    const element = await this.TokenNotificationTitle;
    await element.waitForDisplayed();
    await element.waitForExist({ reverse: true });
  }

  async isToastNotificationDisplayed() {
    const element = await this.TokenNotificationTitle;
    await element.waitForDisplayed();
    expect(await element.getText()).toContain('Transaction');
    expect(await element.getText()).toContain('Complete!');
    await element.waitForExist({ reverse: true });
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
  }
}

export default new WalletMainScreen();
