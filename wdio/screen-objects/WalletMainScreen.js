import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures.js';
import { WALLET_CONTAINER_ID } from './testIDs/Screens/WalletScreen-testIds.js';
import { ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID } from './testIDs/Components/OnboardingWizard.testIds';

import {
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
  ACCOUNT_OVERVIEW_ID,
} from './testIDs/Screens/WalletView.testIds';

import { NOTIFICATION_TITLE } from './testIDs/Components/Notification.testIds';
import { TAB_BAR_WALLET_BUTTON } from './testIDs/Components/TabBar.testIds';
import { BACK_BUTTON_SIMPLE_WEBVIEW } from './testIDs/Components/SimpleWebView.testIds';

class WalletMainScreen {
  get noThanks() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
    );
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

  get Identicon() {
    return Selectors.getElementByPlatform(WALLET_ACCOUNT_ICON);
  }

  get WalletScreenContainer() {
    return Selectors.getXpathElementByResourceId(WALLET_CONTAINER_ID);
  }

  get networkInNavBar() {
    return Selectors.getXpathElementByResourceId(NAVBAR_NETWORK_BUTTON);
  }

  get mainWalletView() {
    return Selectors.getXpathElementByResourceId(ACCOUNT_OVERVIEW_ID);
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
    return Selectors.getXpathElementByResourceId(MAIN_WALLET_ACCOUNT_ACTIONS);
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
    return Selectors.getXpathElementByResourceId(TAB_BAR_WALLET_BUTTON);
  }

  get goBackSimpleWebViewButton() {
    return Selectors.getElementByPlatform(BACK_BUTTON_SIMPLE_WEBVIEW);
  }

  get zeroBalance() {
    return Selectors.getXpathElementByText('$0.00');
  }

  get networkModal() {
    return Selectors.getXpathElementByText('Localhost 8545 now active.');
  }

  async tapNoThanks() {
    await Gestures.waitAndTap(this.noThanks);
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

  async isMainWalletViewVisible() {
    const element = await this.walletButton;
    await element.waitForDisplayed({ timeout: 100000 });
  }

  async isSubmittedNotificationDisplayed() {
    const element = await this.TokenNotificationTitle;
    await element.waitForDisplayed();
    await expect(element).toHaveText('Transaction submitted');
    await element.waitForExist({ reverse: true });
  }

  async isCompleteNotificationDisplayed() {
    const element = await this.TokenNotificationTitle;
    await element.waitForDisplayed();
    await expect(element).toHaveTextContaining('Transaction');
    await expect(element).toHaveTextContaining('Complete!');
    await element.waitForExist({ reverse: true });
  }

  async isNetworkNavbarTitle(text) {
    await expect(this.networkNavbarTitle).toHaveText(text);
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

  async waitForNetworkModaltoDisappear() {
    const element = await this.networkModal;
    await element.waitForExist({ reverse: true });
  }
}

export default new WalletMainScreen();
