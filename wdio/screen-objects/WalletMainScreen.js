import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures.js';
import { ProtectWalletModalSelectorsIDs } from '../../e2e/selectors/Onboarding/ProtectWalletModal.selectors';
import { AccountActionsBottomSheetSelectorsIDs } from '../../e2e/selectors/wallet/AccountActionsBottomSheet.selectors';
import { ToastSelectorsIDs } from '../../e2e/selectors/wallet/ToastModal.selectors';
import { TabBarSelectorIDs } from '../../e2e/selectors/wallet/TabBar.selectors';

import { BACK_BUTTON_SIMPLE_WEBVIEW } from './testIDs/Components/SimpleWebView.testIds';
import { WalletViewSelectorsIDs } from '../../e2e/selectors/wallet/WalletView.selectors';
import AppwrightSelectors from '../helpers/AppwrightSelectors.js';
import { expect as appwrightExpect } from 'appwright';

class WalletMainScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

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
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.ACCOUNT_ICON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletViewSelectorsIDs.ACCOUNT_ICON);
    }
  }

  get swapButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.WALLET_SWAP_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletViewSelectorsIDs.WALLET_SWAP_BUTTON);
    }
  }

  get WalletScreenContainer() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.WALLET_CONTAINER);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletViewSelectorsIDs.WALLET_CONTAINER);
    }
  }

  get networkInNavBar() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.NAVBAR_NETWORK_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, 'token-network-filter');
    }
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
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.ACCOUNT_ACTIONS);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletViewSelectorsIDs.ACCOUNT_ACTIONS);
    }
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
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(TabBarSelectorIDs.WALLET);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TabBarSelectorIDs.WALLET);

    }
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

  async tapOnToken(token) {
    if (!this._device) {
      await Gestures.waitAndTap(this.accountIcon);
    } else {
      const isAndroid = AppwrightSelectors.isAndroid(this._device);
      
      let tokenName;
      if (isAndroid) {
        // For Android: use asset-{token} approach
        tokenName = await AppwrightSelectors.getElementByID(this._device, `asset-${token}`);
      } else {
        // For iOS: use catch-all selector
        tokenName = await AppwrightSelectors.getElementByCatchAll(this._device, `${token}`);
      }
      
      await tokenName.tap();
    }
  }

  async isTokenVisible(token) {
    const isAndroid = AppwrightSelectors.isAndroid(this._device);
    if (isAndroid) {
      const tokenName = await AppwrightSelectors.getElementByID(this._device, `asset-${token}`);
      await tokenName.isVisible();
    } else {
      const tokenName = await AppwrightSelectors.getElementByCatchAll(this._device, token);
      await tokenName.isVisible();
    }
  }

  async tapIdenticon() {
    if (!this._device) {
      await Gestures.waitAndTap(this.accountIcon);
    } else {
      const element = await this.accountIcon;
      await element.tap();
    }
  }
  async tapSwapButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.swapButton);
    } else {
      const element = await this.swapButton;
      await element.tap();
    }
  }

  async tapNetworkNavBar() {

    if (!this._device) {
      await Gestures.waitAndTap(await this.networkInNavBar);
    } else {
      const element = await this.networkInNavBar;
      await element.tap();
    }
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

  async clickOnMainScreen() { // to close account actions bottom sheet
    if (!this._device) {
      await Gestures.waitAndTap(this.WalletScreenContainer);
    } else {
      await this._device.tap({ x: 100, y: 100 });
    }
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
    if (!this._device) {
      await this.walletButton.waitForDisplayed();
    } else {
      const element = await this.walletButton;
      await element.waitFor('visible',{ timeout: 10000 });
      await appwrightExpect(element).toBeVisible();
    }
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
    if (!this._device) {
      await Gestures.waitAndTap(this.accountActionsButton);
    } else {
      const element = await this.accountActionsButton;
      await element.tap();
    }
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
