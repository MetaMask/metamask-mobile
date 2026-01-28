import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures.js';
import { ProtectWalletModalSelectorsIDs } from '../../app/components/UI/ProtectYourWalletModal/ProtectWalletModal.testIds';
import { AccountActionsBottomSheetSelectorsIDs } from '../../app/components/Views/AccountActions/AccountActionsBottomSheet.testIds';
import { ToastSelectorsIDs } from '../../app/component-library/components/Toast/ToastModal.testIds';
import { TabBarSelectorIDs } from '../../app/components/Nav/Main/TabBar.testIds';

import { BACK_BUTTON_SIMPLE_WEBVIEW } from './testIDs/Components/SimpleWebView.testIds';
import { WalletViewSelectorsIDs } from '../../app/components/Views/Wallet/WalletView.testIds';
import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';
import TimerHelper from 'appwright/utils/TimersHelper.js';

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

          if (AppwrightSelectors.isAndroid(this._device)) {
            return AppwrightSelectors.getElementByID(
              this._device,
              WalletViewSelectorsIDs.ACCOUNT_ICON,
            );
          } else {
            return AppwrightSelectors.getElementByCatchAll(this._device, WalletViewSelectorsIDs.ACCOUNT_ICON);
          }
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
      return AppwrightSelectors.getElementByID(this._device, 'tokens-network-filter');
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

  get totalBalanceText() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT);
    } else {
      return AppwrightSelectors.getElementByID(this._device, WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT);
    }
  }

  get balanceContainer() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId('balance-container');
    } else {
      return AppwrightSelectors.getElementByID(this._device, 'balance-container');
    }
  }

  get tokenBalancesLoadedMarker() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId('token-balances-loaded-marker');
    } else {
      return AppwrightSelectors.getElementByID(this._device, 'token-balances-loaded-marker');
    }
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
    if (!this._device) {
      await Gestures.tapTextByXpath('NFTs');
    } else {
      // For Appwright, tap by text
      const nftTabText = AppwrightSelectors.getElementByText(this._device, 'NFTs');
      await AppwrightGestures.tap(nftTabText);
    }
  }

  async tapTokensTab() {
    if (!this._device) {
      await Gestures.tapTextByXpath('Tokens');
    } else {
      // For Appwright, tap by text
      const tokensTabText = AppwrightSelectors.getElementByText(this._device, 'Tokens');
      await AppwrightGestures.tap(tokensTabText);
    }
  }

  async tapOnToken(token) {
    if (!this._device) {
      await Gestures.waitAndTap(this.accountIcon);
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        let tokenName = await AppwrightSelectors.getElementByID(this._device, `asset-${token}`); // for some reason by Id does not work sometimeselse {
        await AppwrightGestures.tap(tokenName);
      } else { // if ios, click on any token that is visible
        const anyToken = await AppwrightSelectors.getElementByID(this._device, `asset-${token}`);
        await AppwrightGestures.tap(anyToken);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }


  }

  async isTokenVisible(token) {
    const isAndroid = AppwrightSelectors.isAndroid(this._device);
    if (isAndroid) {
      const tokenName = await AppwrightSelectors.getElementByID(this._device, `asset-${token}`);
      await tokenName.isVisible();
    } else {
      const tokenName = await AppwrightSelectors.getElementByID(this._device, `asset-${token}`);
      await tokenName.isVisible();
    }
  }

  async tapIdenticon() {
    if (!this._device) {
      await Gestures.waitAndTap(this.accountIcon);
    } else {
      await AppwrightGestures.tap(await this.accountIcon);
    }
  }

  async checkActiveAccount(name, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Look for the account name text directly
        const accountText = await AppwrightSelectors.getElementByText(this.device, name, true);
        const isVisible = await accountText.isVisible({ timeout: 1000 });
        
        if (isVisible) {
          return; // Success - found the account name
        }
      } catch {
        // Element not found yet, continue polling
      }
      
      // Wait 500ms before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Expected account "${name}" to be visible after ${timeout}ms`);
  }


  async tapSwapButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.swapButton);
    } else {
      await AppwrightGestures.tap(await this.swapButton);
    }
  }

  async tapNetworkNavBar() {

    if (!this._device) {
      await Gestures.waitAndTap(await this.networkInNavBar);
    } else {
      await AppwrightGestures.tap(await this.networkInNavBar);
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
    const container = await this.WalletScreenContainer;
    await appwrightExpect(container).toBeVisible();
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
      await appwrightExpect(element).toBeVisible({ timeout: 30000 });
    }
  }

  async getTotalBalanceText() {
    if (!this._device) {
      return await this.totalBalanceText;
    } else {
      const balanceContainer = await AppwrightSelectors.getElementByID(this._device, 'total-balance-text');
      const balanceContainerText = await balanceContainer.getText();

      return balanceContainerText;
    }
  }

  async isMenuButtonVisible() {
    if (!this._device) {
      return await this.balanceContainer.isVisible();
    } else {
      const menuButton = await AppwrightSelectors.getElementByID(this._device, WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON);
      const timer = new TimerHelper('Time for the menu button to be visible');
      timer.start();
      await appwrightExpect(menuButton).toBeVisible();
      timer.stop();
      return timer;
    }
  }

  async waitForBalanceToStabilize(options = {}) {
    const {
      maxWaitTime = 60000,
      pollInterval = 100,
      sameResultTimeout = 8000
    } = options;

    const startTime = Date.now();
    const isIOS = AppwrightSelectors.isIOS(this._device);


    // iOS: Element lookups are extremely slow (15-30s each via Appwright).
    // Skip stability loop and just wait for a valid balance once.
    if (isIOS) {
      let previousBalance = '';
      while (Date.now() - startTime < maxWaitTime) {
        try {
          const balanceElement = await AppwrightSelectors.getElementByID(this._device, 'total-balance-text');
          const rawBalance = await balanceElement.getText();
          const balance = (rawBalance || '').trim();
          previousBalance = balance;

          if (balance && balance !== '' && balance !== '$0.00') {
            return balance;
          }
        } catch (error) {
        }
        await AppwrightGestures.wait(1000);
      }
      return previousBalance;
    }

    // Android: Fast element lookups, use stability polling
    let balanceElement = await AppwrightSelectors.getElementByID(this._device, 'total-balance-text');
    let previousBalance = '';
    let sameResultStartTime = null;

    while (true) {
      const elapsedTime = Date.now() - startTime;

      if (elapsedTime > maxWaitTime) {
        return previousBalance;
      }

      let rawBalance;
      try {
        rawBalance = await balanceElement.getText();
      } catch (error) {
        balanceElement = await AppwrightSelectors.getElementByID(this._device, 'total-balance-text');
        await AppwrightGestures.wait(pollInterval);
        continue;
      }

      const currentBalance = (rawBalance || '').trim();

      if (!currentBalance || currentBalance === '' || currentBalance === '$0.00') {
        await AppwrightGestures.wait(pollInterval);
        continue;
      }

      if (currentBalance === previousBalance) {
        const timeSinceSameResult = Date.now() - sameResultStartTime;
        if (timeSinceSameResult >= sameResultTimeout) {
          return currentBalance;
        }
      } else {
        sameResultStartTime = Date.now();
        previousBalance = currentBalance;
      }

      await AppwrightGestures.wait(pollInterval);
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
      await AppwrightGestures.tap(await this.accountActionsButton);
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
