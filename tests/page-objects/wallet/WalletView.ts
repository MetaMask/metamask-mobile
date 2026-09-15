import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../../../app/components/Views/Wallet/WalletView.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import type { AppiumElement } from '../../framework/AppiumElement';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { getAssetTestId } from '../../../app/components/UI/AssetElement/AssetElement.testIds';
import WalletHomeScroll from './WalletHomeScroll';
import { WalletHomeSections as WalletHomeSectionsBase } from './WalletHomeSections';

class WalletView extends WalletHomeSectionsBase {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_CONTAINER);
  }

  /**
   * Wallet header root — high in the Android view hierarchy (above scroll /
   * homepage sections). Partial ID match so package-qualified resource IDs
   * resolve without deep tree walks into token lists.
   */
  get headerRoot(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      new RegExp(WalletViewSelectorsIDs.WALLET_HEADER_ROOT),
    );
  }

  get walletScrollContainer(): string {
    return WalletHomeScroll.walletScrollContainer;
  }

  get walletScrollView(): Promise<AppiumElement> {
    return WalletHomeScroll.walletScrollView;
  }

  get activityButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON,
    );
  }

  async tapActivityButton(): Promise<void> {
    await Gestures.waitAndTap(this.activityButton, {
      elemDescription: 'Wallet Activity button',
    });
  }

  get earnButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_BUTTON);
  }

  get accountIcon(): Promise<AppiumElement> {
    const id = WalletViewSelectorsIDs.ACCOUNT_ICON;
    if (PlatformDetector.isIOS()) {
      // iOS: catch-all across name/label/text (historical AccessibilityId flakiness)
      return Matchers.getElementByNativeXPath(
        `//*[contains(@name,'${id}') or contains(@label,'${id}') or contains(@text,'${id}')]`,
      );
    }
    return Matchers.getElementByID(id);
  }

  get eyeSlashIcon(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.EYE_SLASH_ICON);
  }

  get hamburgerMenuButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON,
    );
  }

  get navbarNetworkText(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT);
  }

  get navbarNetworkPicker(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
    );
  }

  get navbarCardButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.CARD_BUTTON);
  }

  get importNFTButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON);
  }

  get importTokensButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON);
  }

  get totalBalance(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT);
  }

  get accountNameLabelText(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  get accountName(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  async checkActiveAccount(
    expectedName: string,
    timeout = 10_000,
  ): Promise<void> {
    await Assertions.expectElementToHaveText(
      this.accountNameLabelText,
      expectedName,
      { timeout },
    );
  }

  get hideTokensLabel(): Promise<AppiumElement> {
    return Matchers.getElementByText(WalletViewSelectorsText.HIDE_TOKENS);
  }

  get currentMainWalletAccountActions(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  get tokenNetworkFilter(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
  }

  get sortButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.SORT_BUTTON);
  }

  get carouselContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.CAROUSEL_CONTAINER);
  }

  get carouselProgressDots(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.CAROUSEL_PROGRESS_DOTS,
    );
  }
  get testCollectible(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TEST_COLLECTIBLE, 1);
  }
  get testCollectibleFallback(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.COLLECTIBLE_FALLBACK,
      1,
    );
  }
  // Wallet-specific action buttons (from AssetDetailsActions in Wallet view)
  get walletBuyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_BUY_BUTTON);
  }

  get walletSwapButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_SWAP_BUTTON);
  }

  get walletSendButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_SEND_BUTTON);
  }

  // Balance Empty State - displayed when account group has zero balance across all networks
  get balanceEmptyStateContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER,
    );
  }

  get balanceEmptyStateActionButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_ACTION_BUTTON,
    );
  }

  async tapCurrentMainWalletAccountActions(): Promise<void> {
    await Gestures.waitAndTap(this.currentMainWalletAccountActions, {
      elemDescription: 'Current Main Wallet Account Actions',
    });
  }

  tokenRow(token: string, index = 0): Promise<AppiumElement> {
    return Matchers.getElementByID(getAssetTestId(token), index);
  }

  async tapOnToken(token: string, index = 0): Promise<void> {
    const tokenLabel = token || WalletViewSelectorsText.DEFAULT_TOKEN;
    await Gestures.waitAndTap(this.tokenRow(tokenLabel, index), {
      elemDescription: 'Token',
    });
  }

  async tapIdenticon(): Promise<void> {
    await Gestures.waitAndTap(this.accountIcon, {
      elemDescription: 'Top Account Icon',
    });
  }

  async tapHamburgerMenu(): Promise<void> {
    await Gestures.waitAndTap(this.hamburgerMenuButton, {
      elemDescription: 'Hamburger Menu Button',
    });
  }

  async tapNetworksButtonOnNavBar(): Promise<void> {
    await Gestures.waitAndTap(
      Matchers.getElementByID(WalletViewSelectorsIDs.NAVBAR_NETWORK_BUTTON),
      {
        elemDescription: 'Navbar Network Button',
      },
    );
  }

  async tapNavbarCardButton(): Promise<void> {
    await Gestures.waitAndTap(this.navbarCardButton, {
      elemDescription: 'Card Button on Navbar',
    });
  }

  async scrollToToken(
    tokenName: string,
    direction: 'up' | 'down' = 'down',
  ): Promise<void> {
    await Gestures.scrollToElement(
      this.tokenInWallet(tokenName),
      Matchers.scrollContainer(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
      {
        direction,
        scrollAmount: 50,
      },
    );
  }

  async tapImportNFTButton(): Promise<void> {
    await Gestures.waitAndTap(this.importNFTButton, {
      elemDescription: 'Import NFT Button',
    });
  }

  async tapOnNftName(): Promise<void> {
    try {
      await Gestures.waitAndTap(this.testCollectible, {
        elemDescription: 'NFT Name',
      });
    } catch {
      await Gestures.waitAndTap(this.testCollectibleFallback, {
        elemDescription: 'NFT Name Fallback',
      });
    }
  }

  async tapImportTokensButton(): Promise<void> {
    await Gestures.waitAndTap(this.importTokensButton, {
      elemDescription: 'Import Tokens Button',
    });
  }

  async removeTokenFromWallet(token: string): Promise<void> {
    const elem = Matchers.getElementByText(token);
    await Gestures.longPress(elem, {
      elemDescription: 'Long Pressing Token',
    });
    await Gestures.waitAndTap(this.hideTokensLabel, {
      elemDescription: 'Hide Tokens Label',
    });
  }

  async tokenInWallet(tokenName: string): Promise<AppiumElement> {
    return Matchers.getElementByText(tokenName);
  }

  async nftInWallet(nftName: string): Promise<AppiumElement> {
    return Matchers.getElementByText(nftName);
  }

  async tapTokenNetworkFilter(): Promise<void> {
    await Gestures.waitAndTap(this.tokenNetworkFilter, {
      elemDescription: 'Token Network Filter',
    });
  }

  async tapSortBy(): Promise<void> {
    await Gestures.waitAndTap(this.sortButton, {
      elemDescription: 'Sort By',
    });
  }

  async tapOnEarnButton(): Promise<void> {
    await Gestures.waitAndTap(this.earnButton, {
      elemDescription: 'Earn Button',
    });
  }

  /**
   * Swipes the carousel in the specified direction.
   * @param {'left' | 'right'} direction - The direction to swipe ('left' or 'right').
   */
  async swipeCarousel(direction: 'left' | 'right'): Promise<void> {
    await Gestures.swipe(this.carouselContainer, direction, {
      speed: 'slow',
      percentage: 0.7,
      elemDescription: 'Swipe Carousel',
    });
  }

  async waitForBalanceToStabilize(
    options: {
      maxWaitTime?: number;
      pollInterval?: number;
      sameResultTimeout?: number;
    } = {},
  ): Promise<string> {
    const {
      maxWaitTime = 60000,
      pollInterval = 100,
      sameResultTimeout = 8000,
    } = options;

    const startTime = Date.now();
    const isIOS = PlatformDetector.isIOS();

    if (isIOS) {
      // iOS: Element lookups are extremely slow (15-30s each).
      // Skip stability loop and just wait for a valid balance once.
      let previousBalance = '';
      while (Date.now() - startTime < maxWaitTime) {
        try {
          const balance = (
            await Utilities.getElementText(this.totalBalance)
          ).trim();
          previousBalance = balance;

          if (balance && balance !== '' && balance !== '$0.00') {
            return balance;
          }
        } catch {
          // Element not found yet, retry
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      return previousBalance;
    }

    // Android: Fast element lookups, use stability polling
    let previousBalance = '';
    let sameResultStartTime: number | null = null;

    while (true) {
      if (Date.now() - startTime > maxWaitTime) {
        return previousBalance;
      }

      let currentBalance: string;
      try {
        currentBalance = (
          await Utilities.getElementText(this.totalBalance)
        ).trim();
      } catch {
        await new Promise((r) => setTimeout(r, pollInterval));
        continue;
      }

      if (
        !currentBalance ||
        currentBalance === '' ||
        currentBalance === '$0.00'
      ) {
        await new Promise((r) => setTimeout(r, pollInterval));
        continue;
      }

      if (currentBalance === previousBalance && sameResultStartTime) {
        const timeSinceSameResult = Date.now() - sameResultStartTime;
        if (timeSinceSameResult >= sameResultTimeout) {
          return currentBalance;
        }
      } else {
        sameResultStartTime = Date.now();
        previousBalance = currentBalance;
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }
  }

  async getBalanceText(): Promise<string> {
    await Assertions.expectElementToBeVisible(this.totalBalance);
    return Utilities.getElementText(this.totalBalance);
  }

  /**
   * Toggles the balance visibility by tapping the eye slash icon.
   * This method can be used to both hide and show the balance.
   * @returns {Promise<void>} A promise that resolves when the balance visibility is toggled.
   */
  async toggleBalanceVisibility(): Promise<void> {
    await Gestures.waitAndTap(this.eyeSlashIcon, {
      elemDescription: 'Eye Slash Icon',
    });
  }

  /**
   * Checks if the balance is currently visible by examining the balance text.
   * @returns {Promise<boolean>} A promise that resolves to true if balance is visible, false if hidden.
   */
  async isBalanceVisible(): Promise<boolean> {
    const balanceText = await this.getBalanceText();
    // If it shows currency symbols or numbers, it's visible
    return !balanceText.includes('••••');
  }

  /**
   * Hides the balance by tapping the eye slash icon only if it's currently visible.
   * @returns {Promise<void>} A promise that resolves when the balance is hidden.
   */
  async hideBalance(): Promise<void> {
    if (await this.isBalanceVisible()) {
      await this.toggleBalanceVisibility();
    }
  }

  /**
   * Shows the balance by tapping the eye slash icon only if it's currently hidden.
   * @returns {Promise<void>} A promise that resolves when the balance is shown.
   */
  async showBalance(): Promise<void> {
    if (!(await this.isBalanceVisible())) {
      await this.toggleBalanceVisibility();
    }
  }

  async tapWalletBuyButton(): Promise<void> {
    await Gestures.waitAndTap(this.walletBuyButton, {
      elemDescription: 'Wallet Buy Button',
    });
  }

  async tapWalletSwapButton(): Promise<void> {
    await Gestures.waitAndTap(this.walletSwapButton, {
      elemDescription: 'Wallet Swap Button',
    });
  }

  async tapWalletSendButton(): Promise<void> {
    await Gestures.waitAndTap(this.walletSendButton, {
      elemDescription: 'Wallet Send Button',
    });
  }

  async tapBalanceEmptyStateActionButton(): Promise<void> {
    await Gestures.waitAndTap(this.balanceEmptyStateActionButton, {
      elemDescription: 'Balance Empty State Action Button',
    });
  }
}

export default new WalletView();
