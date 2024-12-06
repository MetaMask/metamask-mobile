import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures.js';
import { ProtectWalletModalSelectorsIDs } from '../../e2e/selectors/Onboarding/ProtectWalletModal.selectors';
import { AccountActionsBottomSheetSelectorsIDs } from '../../e2e/selectors/wallet/AccountActionsBottomSheet.selectors';
import { ToastSelectorsIDs } from '../../e2e/selectors/wallet/ToastModal.selectors';
import { TabBarSelectorIDs } from '../../e2e/selectors/wallet/TabBar.selectors';

import { BACK_BUTTON_SIMPLE_WEBVIEW } from './testIDs/Components/SimpleWebView.testIds';
import { WalletViewSelectorsIDs } from '../../e2e/selectors/wallet/WalletView.selectors.js';

class WalletMainScreen {
  get ImportToken() {
    return Selectors.getElementByPlatform(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON);
  }

  get ImportNFT() {
    return Selectors.getElementByPlatform(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON);
  }

  get TokenNotificationTitle() {
    return Selectors.getElementByPlatform(ToastSelectorsIDs.NOTIFICATION_TITLE);
  }

  get accountIcon() {
    return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.ACCOUNT_ICON);
  }

  get WalletScreenContainer() {
    return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.WALLET_CONTAINER);
  }

  get networkInNavBar() {
    return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.NAVBAR_NETWORK_BUTTON);
  }

  get remindMeLaterNotification() {
    return Selectors.getElementByPlatform(
      ProtectWalletModalSelectorsIDs.REMIND_ME_LATER_BUTTON,
    );
  }

  get backupAlertModal() {
    return Selectors.getElementByPlatform(ProtectWalletModalSelectorsIDs.COLLAPSED_WALLET_MODAL);
  }

  get networkNavbarTitle() {
    return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT);
  }

  get accountActionsButton() {
    return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.ACCOUNT_ACTIONS);
  }

  get privateKeyActionButton() {
    return Selectors.getElementByPlatform(AccountActionsBottomSheetSelectorsIDs.SHOW_PRIVATE_KEY);
  }

  get shareAddressActionButton() {
    return Selectors.getElementByPlatform(AccountActionsBottomSheetSelectorsIDs.SHARE_ADDRESS);
  }

  get viewEtherscanActionButton() {
    return Selectors.getElementByPlatform(AccountActionsBottomSheetSelectorsIDs.VIEW_ETHERSCAN);
  }

  get walletButton() {
    return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.WALLET);
  }

  get goBackSimpleWebViewButton() {
    return Selectors.getElementByPlatform(BACK_BUTTON_SIMPLE_WEBVIEW);
  }

  get networkModal() {
    return Selectors.getXpathElementByText('Localhost 8545 now active.');
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
    await Gestures.waitAndTap(this.accountIcon);
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
    await expect(this.WalletScreenContainer).toBeDisplayed();
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
    await expect(element).toBeDisplayed();
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

  async waitForNetworkModalToDisappear() {
    const element = await this.networkModal;
    await element.waitForExist({ reverse: true });
  }
}

export default new WalletMainScreen();
