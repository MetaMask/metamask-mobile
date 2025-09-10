import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../../selectors/wallet/WalletView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import TestHelpers from '../../helpers.js';
import Assertions from '../../framework/Assertions';

class WalletView {
  static readonly MAX_SCROLL_ITERATIONS = 8;

  get container(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_CONTAINER);
  }

  get earnButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_BUTTON);
  }

  get stakedEthereumLabel(): DetoxElement {
    return Matchers.getElementByText(WalletViewSelectorsText.STAKED_ETHEREUM);
  }

  get stakeMoreButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_MORE_BUTTON);
  }

  get tokenDetectionLinkButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.WALLET_TOKEN_DETECTION_LINK_BUTTON,
    );
  }

  get accountIcon(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.ACCOUNT_ICON);
  }

  get eyeSlashIcon(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.EYE_SLASH_ICON);
  }

  get notificationBellIcon(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.WALLET_NOTIFICATIONS_BUTTON,
    );
  }

  get navbarNetworkText(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT);
  }

  get navbarNetworkButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_BUTTON,
    );
  }

  get navbarNetworkPicker(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
    );
  }

  get navbarCardButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.CARD_BUTTON);
  }

  get nftTab(): DetoxElement {
    return Matchers.getElementByText(WalletViewSelectorsText.NFTS_TAB);
  }

  get nftTabContainer(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.NFT_TAB_CONTAINER);
  }

  get importNFTButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON);
  }

  get importTokensButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON);
  }

  get networkName(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.NETWORK_NAME);
  }

  get totalBalance(): DetoxElement | DetoxMatcher {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT);
  }

  get accountName(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  get hideTokensLabel(): DetoxElement {
    return Matchers.getElementByText(WalletViewSelectorsText.HIDE_TOKENS);
  }

  get currentMainWalletAccountActions(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  get tokenNetworkFilter(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
  }

  get sortButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.SORT_BUTTON);
  }

  get sortBy(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.SORT_BY);
  }

  get tokenNetworkFilterAll(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_ALL,
    );
  }

  get tokenNetworkFilterCurrent(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_CURRENT,
    );
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByText('Cancel');
  }

  get carouselContainer(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.CAROUSEL_CONTAINER);
  }

  get carouselProgressDots(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.CAROUSEL_PROGRESS_DOTS,
    );
  }
  get testCollectible(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TEST_COLLECTIBLE, 1);
  }
  get testCollectibleFallback(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.COLLECTIBLE_FALLBACK,
      1,
    );
  }

  getCarouselSlide(id: string): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.CAROUSEL_SLIDE(id));
  }

  getCarouselSlideTitle(id: string): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.CAROUSEL_SLIDE_TITLE(id),
    );
  }

  getCarouselSlideCloseButton(id: string): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.CAROUSEL_SLIDE_CLOSE_BUTTON(id),
    );
  }

  async tapCurrentMainWalletAccountActions(): Promise<void> {
    await Gestures.waitAndTap(this.currentMainWalletAccountActions, {
      elemDescription: 'Current Main Wallet Account Actions',
    });
  }

  async tapOnToken(token: string, index = 0): Promise<void> {
    const elem = Matchers.getElementByText(
      token || WalletViewSelectorsText.DEFAULT_TOKEN,
      index,
    );
    await Gestures.waitAndTap(elem, {
      elemDescription: 'Token',
    });
  }

  async tapIdenticon(): Promise<void> {
    await Gestures.waitAndTap(this.accountIcon, {
      elemDescription: 'Top Account Icon',
      checkStability: true,
    });
  }

  async tapBellIcon(): Promise<void> {
    await Gestures.waitAndTap(this.notificationBellIcon, {
      elemDescription: 'Notification Bell Icon',
    });
  }

  async tapNetworksButtonOnNavBar(): Promise<void> {
    await TestHelpers.tap(WalletViewSelectorsIDs.NAVBAR_NETWORK_BUTTON);
  }

  async tapNavbarCardButton(): Promise<void> {
    await Gestures.waitAndTap(this.navbarCardButton, {
      elemDescription: 'Card Button on Navbar',
    });
  }

  async tapNftTab(): Promise<void> {
    await Gestures.waitAndTap(this.nftTab);
  }

  async scrollDownOnNFTsTab(): Promise<void> {
    await Gestures.swipe(this.nftTabContainer, 'up', {
      speed: 'slow',
      percentage: 0.6,
    });
  }

  async scrollToBottomOfTokensList(): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();
    for (let i = 0; i < WalletView.MAX_SCROLL_ITERATIONS; i++) {
      await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'up', {
        speed: 'fast',
        percentage: 0.7,
      });
    }
  }

  async scrollToTopOfTokensList(): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();
    await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'down', {
      speed: 'fast',
      percentage: 0.7,
    });
  }

  async pullToRefreshTokensList(): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();
    await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'down', {
      speed: 'slow',
      percentage: 0.8,
      elemDescription: 'pull to refresh tokens list',
    });
  }

  async scrollToToken(
    tokenName: string,
    direction: 'up' | 'down' = 'down',
  ): Promise<void> {
    await Gestures.scrollToElement(
      this.tokenInWallet(tokenName) as unknown as DetoxElement,
      Matchers.getIdentifier(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
      {
        direction,
        scrollAmount: 50,
      },
    );
  }

  async scrollUpOnNFTsTab(): Promise<void> {
    await Gestures.swipe(this.nftTabContainer, 'down', {
      speed: 'slow',
      percentage: 0.6,
    });
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

  async tapOnNFTInWallet(nftName: string): Promise<void> {
    const elem = Matchers.getElementByText(nftName);
    await Gestures.waitAndTap(elem, {
      elemDescription: 'NFT Name',
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

  async tokenInWallet(tokenName: string): Promise<DetoxElement> {
    return Matchers.getElementByText(tokenName);
  }

  async getTokensInWallet(): Promise<DetoxElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST,
    );
  }

  async nftIDInWallet(nftId: string): Promise<DetoxElement> {
    return Matchers.getElementByID(nftId);
  }

  async nftInWallet(nftName: string): Promise<DetoxElement> {
    return Matchers.getElementByText(nftName);
  }

  async tapNewTokensFound(): Promise<void> {
    await Gestures.waitAndTap(this.tokenDetectionLinkButton, {
      elemDescription: 'New Tokens Found Button',
    });
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

  async tapTokenNetworkFilterAll(): Promise<void> {
    await Gestures.waitAndTap(this.tokenNetworkFilterAll, {
      elemDescription: 'Token Network Filter All',
    });
  }

  async tapTokenNetworkFilterCurrent(): Promise<void> {
    await Gestures.waitAndTap(this.tokenNetworkFilterCurrent, {
      elemDescription: 'Token Network Filter Current',
    });
  }

  async tapOnEarnButton(): Promise<void> {
    await Gestures.waitAndTap(this.earnButton, {
      elemDescription: 'Earn Button',
    });
  }

  async tapOnStakedEthereum(): Promise<void> {
    await Gestures.waitAndTap(this.stakedEthereumLabel, {
      elemDescription: 'Staked Ethereum Label',
    });
  }

  async tapOnStakeMore(): Promise<void> {
    await Gestures.waitAndTap(this.stakeMoreButton, {
      elemDescription: 'Stake More Button',
    });
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button',
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

  /**
   * Closes the carousel slide with the specified ID by tapping its close button.
   *
   * @param {string|number} id - The identifier of the carousel slide to close.
   * @returns {Promise<void>} A promise that resolves when the slide has been closed.
   */
  async closeCarouselSlide(id: string): Promise<void> {
    await Gestures.tap(this.getCarouselSlideCloseButton(id), {
      elemDescription: 'Close Carousel Slide',
    });
  }

  /**
   * Taps on a carousel slide with the specified identifier.
   *
   * @param {string} id - The unique identifier of the carousel slide to tap.
   * @returns {Promise<void>} Resolves when the tap action is complete.
   */
  async tapCarouselSlide(id: string): Promise<void> {
    await Gestures.tap(this.getCarouselSlide(id));
  }

  get defiTab(): DetoxElement {
    return Matchers.getElementByText(WalletViewSelectorsText.DEFI_TAB);
  }

  get defiNetworkFilter(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
    );
  }

  get defiTabContainer(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER,
    );
  }

  get defiPositionDetailsContainer(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER,
    );
  }

  async tapOnDeFiTab(): Promise<void> {
    await Gestures.waitAndTap(this.defiTab, {
      elemDescription: 'DeFi Tab',
    });
  }

  async tapOnDeFiNetworksFilter(): Promise<void> {
    await Gestures.waitAndTap(this.defiNetworkFilter, {
      elemDescription: 'DeFi Networks Filter',
    });
  }

  async tapOnDeFiPosition(positionName: string): Promise<void> {
    const elem = Matchers.getElementByText(positionName);
    await Gestures.waitAndTap(elem, {
      elemDescription: 'DeFi Position',
    });
  }

  // TODO test this
  async getBalanceText(): Promise<string> {
    const balanceElement = this.totalBalance;
    await Assertions.expectElementToBeVisible(balanceElement);

    const elem = await balanceElement;
    const attributes = await (elem as IndexableNativeElement).getAttributes();
    return (
      (attributes as { text: string; label: string }).text ||
      (attributes as { text: string; label: string }).label
    );
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

  // Wallet-specific action buttons (from AssetDetailsActions in Wallet view)
  get walletFundButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_FUND_BUTTON);
  }

  get walletSwapButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_SWAP_BUTTON);
  }

  get walletBridgeButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_BRIDGE_BUTTON);
  }

  get walletSendButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_SEND_BUTTON);
  }

  get walletReceiveButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.WALLET_RECEIVE_BUTTON,
    );
  }

  async tapWalletFundButton(): Promise<void> {
    await Gestures.waitAndTap(this.walletFundButton, {
      elemDescription: 'Wallet Fund Button',
    });
  }

  async tapWalletSwapButton(): Promise<void> {
    await Gestures.waitAndTap(this.walletSwapButton, {
      elemDescription: 'Wallet Swap Button',
    });
  }

  async tapWalletBridgeButton(): Promise<void> {
    await Gestures.waitAndTap(this.walletBridgeButton, {
      elemDescription: 'Wallet Bridge Button',
    });
  }

  async tapWalletSendButton(): Promise<void> {
    await Gestures.waitAndTap(this.walletSendButton, {
      elemDescription: 'Wallet Send Button',
    });
  }

  async tapWalletReceiveButton(): Promise<void> {
    await Gestures.waitAndTap(this.walletReceiveButton, {
      elemDescription: 'Wallet Receive Button',
    });
  }

  get perpsTab(): DetoxElement {
    return Matchers.getElementByText(WalletViewSelectorsText.PERPS_TAB);
  }

  async tapOnPerpsTab(): Promise<void> {
    await Gestures.waitAndTap(this.perpsTab, {
      elemDescription: 'Perps Tab Button',
    });
  }

  async verifyTokenNetworkFilterText(expectedText: string): Promise<void> {
    await Assertions.expectElementToHaveLabel(
      this.tokenNetworkFilter,
      expectedText,
      {
        description: `token network filter should display "${expectedText}"`,
      },
    );
  }
}

export default new WalletView();
