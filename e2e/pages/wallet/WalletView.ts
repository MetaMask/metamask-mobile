import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../../selectors/wallet/WalletView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import TestHelpers from '../../helpers.js';
import Assertions from '../../framework/Assertions';

class WalletView {
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

  async getNavbarNetworkPicker(): Promise<DetoxElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
    );
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
    return device.getPlatform() === 'android'
      ? Matchers.getElementByID(WalletViewSelectorsIDs.COLLECTIBLE_FALLBACK, 1)
      : Matchers.getElementByID(WalletViewSelectorsIDs.TEST_COLLECTIBLE, 1);
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

  async tapNftTab(): Promise<void> {
    await Gestures.waitAndTap(this.nftTab);
  }

  async scrollDownOnNFTsTab(): Promise<void> {
    await Gestures.swipe(this.nftTabContainer, 'up', {
      speed: 'slow',
      percentage: 0.6,
    });
  }

  async scrollDownOnTokensTab(): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();
    await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'up', {
      speed: 'slow',
      percentage: 0.2,
    });
  }

  async scrollDownOnTokensTabAggressive(): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();
    await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'up', {
      speed: 'slow',
      percentage: 0.8, // Much more aggressive scrolling
    });
  }

  async scrollToBottomOfTokensList(): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();
    // Perform multiple large swipes to reach the bottom
    for (let i = 0; i < 8; i++) {
      await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'up', {
        speed: 'slow',
        percentage: 0.7,
      });
      await TestHelpers.delay(300);
    }
  }

  async scrollUpOnTokensTabSlightly(): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();
    await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'down', {
      speed: 'slow',
      percentage: 0.2,
    });
  }

  async scrollToBottomOfTokensListAndroid(): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();
    // Android needs even more aggressive scrolling with longer delays
    for (let i = 0; i < 10; i++) {
      await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'up', {
        speed: 'slow',
        percentage: 0.8, // More aggressive percentage for Android
      });
      await TestHelpers.delay(400); // Slightly longer delays for Android
    }
  }

  async scrollToTokenWithRetry(
    tokenName: string,
    maxAttempts: number = 8,
  ): Promise<void> {
    // REDIRECT to our new platform-specific methods instead of using old approach
    console.warn(
      `scrollToTokenWithRetry called for ${tokenName} - redirecting to new method`,
    );
    await this.ensureTokenIsFullyVisible(tokenName);
  }

  async ensureTokenIsFullyVisible(tokenName: string): Promise<void> {
    // Platform-specific approach
    if (device.getPlatform() === 'android') {
      await this.ensureTokenIsFullyVisibleAndroid(tokenName);
    } else {
      await this.ensureTokenIsFullyVisibleIOS(tokenName);
    }
  }

  async ensureTokenIsFullyVisibleAndroid(tokenName: string): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();

    // First, scroll to top to start from a known position
    for (let i = 0; i < 5; i++) {
      await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'down', {
        speed: 'fast',
        percentage: 0.9,
      });
      await TestHelpers.delay(300);
    }
    await TestHelpers.delay(2000); // Let everything settle

    // Now use aggressive scrolling with longer timeouts for Android
    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        const token = this.tokenInWallet(tokenName);
        await Assertions.expectElementToBeVisible(token);

        // Extra validation - try to tap to ensure it's really visible
        await TestHelpers.delay(500);
        return; // Token is visible, exit
      } catch (e) {
        // More aggressive scrolling for Android
        await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'up', {
          speed: 'slow',
          percentage: 0.4, // Smaller increments to avoid overshooting
        });
        await TestHelpers.delay(1200); // Longer delays for Android
      }
    }

    // Final desperate attempt - try to use scrollToElement
    try {
      await Gestures.scrollToElement(
        this.tokenInWallet(tokenName) as unknown as DetoxElement,
        Matchers.getIdentifier(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
        {
          direction: 'down',
        },
      );
      await TestHelpers.delay(3000); // Extra long delay for Android

      // Now try multiple micro-adjustments to get 75%+ visibility
      for (let i = 0; i < 5; i++) {
        try {
          const token = this.tokenInWallet(tokenName);
          await Assertions.expectElementToBeVisible(token);
          return;
        } catch (e) {
          if (i < 2) {
            // Try scrolling up slightly
            await Gestures.swipe(
              tokensContainer as unknown as DetoxElement,
              'down',
              {
                speed: 'slow',
                percentage: 0.05,
              },
            );
          } else {
            // Try scrolling down slightly
            await Gestures.swipe(
              tokensContainer as unknown as DetoxElement,
              'up',
              {
                speed: 'slow',
                percentage: 0.05,
              },
            );
          }
          await TestHelpers.delay(1500);
        }
      }
    } catch (e) {
      throw new Error(
        `Android: Could not make token ${tokenName} sufficiently visible after all attempts`,
      );
    }
  }

  async ensureTokenIsFullyVisibleIOS(tokenName: string): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();

    // First, scroll to top to start from a known position (like Android)
    for (let i = 0; i < 5; i++) {
      await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'down', {
        speed: 'fast',
        percentage: 0.8,
      });
      await TestHelpers.delay(200);
    }
    await TestHelpers.delay(1000); // Let everything settle

    // Now use aggressive scrolling similar to Android approach - INCREASED ATTEMPTS
    for (let attempt = 0; attempt < 15; attempt++) {
      try {
        const token = this.tokenInWallet(tokenName);
        await Assertions.expectElementToBeVisible(token);
        return; // Token is visible, exit
      } catch (e) {
        // More aggressive scrolling for iOS (SAME as Android)
        await Gestures.swipe(tokensContainer as unknown as DetoxElement, 'up', {
          speed: 'slow',
          percentage: 0.4, // Same increments as Android
        });
        await TestHelpers.delay(1200); // INCREASED delays for iOS (same as Android)
      }
    }

    // Final desperate attempt - try to use scrollToElement with better error handling
    try {
      await Gestures.scrollToElement(
        this.tokenInWallet(tokenName) as unknown as DetoxElement,
        Matchers.getIdentifier(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
        {
          direction: 'down',
        },
      );
      await TestHelpers.delay(3000); // INCREASED delay for iOS (same as Android)

      // Now try multiple micro-adjustments to get 75%+ visibility (like Android)
      for (let i = 0; i < 5; i++) {
        try {
          const token = this.tokenInWallet(tokenName);
          await Assertions.expectElementToBeVisible(token);
          return;
        } catch (e) {
          if (i < 2) {
            // Try scrolling up slightly - INCREASED percentage
            await Gestures.swipe(
              tokensContainer as unknown as DetoxElement,
              'down',
              {
                speed: 'slow',
                percentage: 0.1, // Increased from 0.08
              },
            );
          } else {
            // Try scrolling down slightly - INCREASED percentage
            await Gestures.swipe(
              tokensContainer as unknown as DetoxElement,
              'up',
              {
                speed: 'slow',
                percentage: 0.1, // Increased from 0.08
              },
            );
          }
          await TestHelpers.delay(1500); // INCREASED delay (same as Android)
        }
      }
    } catch (e) {
      throw new Error(
        `iOS: Could not make token ${tokenName} sufficiently visible after all attempts`,
      );
    }
  }

  async waitForTokenToBeStableAndVisible(tokenName: string): Promise<void> {
    // Ensure token is visible first
    await this.ensureTokenIsFullyVisible(tokenName);

    // Then wait for it to be stable (especially important for Android)
    const stabilityChecks = device.getPlatform() === 'android' ? 5 : 3;

    for (let i = 0; i < stabilityChecks; i++) {
      try {
        const token = this.tokenInWallet(tokenName);
        await Assertions.expectElementToBeVisible(token);
        await TestHelpers.delay(device.getPlatform() === 'android' ? 800 : 400);
      } catch (e) {
        // If it becomes invisible again, re-ensure visibility
        await this.ensureTokenIsFullyVisible(tokenName);
        await TestHelpers.delay(
          device.getPlatform() === 'android' ? 1500 : 1000,
        );
      }
    }
  }

  async ensureTokenIsFullyHittable(tokenName: string): Promise<void> {
    // First ensure it's visible and stable
    await this.waitForTokenToBeStableAndVisible(tokenName);

    const tokensContainer = await this.getTokensInWallet();

    // Enhanced hittability validation with SAME attempts for iOS as Android
    const hittabilityAttempts = device.getPlatform() === 'android' ? 3 : 3; // Same for both platforms

    for (let attempt = 0; attempt < hittabilityAttempts; attempt++) {
      try {
        const token = this.tokenInWallet(tokenName);
        await Assertions.expectElementToBeVisible(token);

        // Additional validation: ensure token bounds are reasonable - SAME delay as Android
        await TestHelpers.delay(device.getPlatform() === 'android' ? 500 : 500);
        return; // Token should be hittable
      } catch (e) {
        // Enhanced centering attempts to fix clipping - MORE AGGRESSIVE for iOS
        if (attempt === 0) {
          // Major repositioning - MORE AGGRESSIVE for iOS than before
          await Gestures.swipe(
            tokensContainer as unknown as DetoxElement,
            'down',
            {
              speed: 'slow',
              percentage: device.getPlatform() === 'android' ? 0.15 : 0.25, // More aggressive for iOS
            },
          );
        } else if (attempt === 1) {
          // Reverse direction to find optimal position - MORE AGGRESSIVE for iOS
          await Gestures.swipe(
            tokensContainer as unknown as DetoxElement,
            'up',
            {
              speed: 'slow',
              percentage: device.getPlatform() === 'android' ? 0.1 : 0.2, // More aggressive for iOS
            },
          );
        } else if (attempt === 2) {
          // Fine-tuning for center position - MORE AGGRESSIVE for iOS
          await Gestures.swipe(
            tokensContainer as unknown as DetoxElement,
            'down',
            {
              speed: 'slow',
              percentage: device.getPlatform() === 'android' ? 0.05 : 0.1, // More aggressive for iOS
            },
          );
        }

        // LONGER delays for iOS
        await TestHelpers.delay(
          device.getPlatform() === 'android' ? 1500 : 2000,
        );
      }
    }

    // Final validation attempt with COMPREHENSIVE error message
    try {
      const token = this.tokenInWallet(tokenName);
      await Assertions.expectElementToBeVisible(token);
    } catch (e) {
      throw new Error(
        `Could not make token ${tokenName} sufficiently hittable after ${hittabilityAttempts} attempts on ${device.getPlatform()}. Last error: ${e}`,
      );
    }
  }

  async centerTokenInViewport(tokenName: string): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();

    // Try to center the token using scrollToElement first
    try {
      await Gestures.scrollToElement(
        this.tokenInWallet(tokenName) as unknown as DetoxElement,
        Matchers.getIdentifier(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
        {
          direction: 'down',
        },
      );
      await TestHelpers.delay(device.getPlatform() === 'android' ? 2000 : 1500);
    } catch (e) {
      // If scrollToElement fails, use manual centering
    }

    // Enhanced centering for both platforms with more attempts
    const adjustmentAttempts = device.getPlatform() === 'android' ? 3 : 4;

    for (let i = 0; i < adjustmentAttempts; i++) {
      try {
        const token = this.tokenInWallet(tokenName);
        await Assertions.expectElementToBeVisible(token);
        break; // Token is well-centered, exit
      } catch (e) {
        // Progressive centering adjustments
        if (i === 0) {
          // Move token away from top edge
          await Gestures.swipe(
            tokensContainer as unknown as DetoxElement,
            'down',
            {
              speed: 'slow',
              percentage: device.getPlatform() === 'android' ? 0.1 : 0.12,
            },
          );
        } else if (i === 1) {
          // Move token away from bottom edge
          await Gestures.swipe(
            tokensContainer as unknown as DetoxElement,
            'up',
            {
              speed: 'slow',
              percentage: device.getPlatform() === 'android' ? 0.08 : 0.1,
            },
          );
        } else if (i === 2) {
          // Fine adjustment toward center
          await Gestures.swipe(
            tokensContainer as unknown as DetoxElement,
            'down',
            {
              speed: 'slow',
              percentage: 0.05,
            },
          );
        }

        await TestHelpers.delay(
          device.getPlatform() === 'android' ? 1000 : 1200,
        );
      }
    }
  }

  async tapOnTokenWithRetry(token: string, index = 0): Promise<void> {
    // First center the token in viewport for optimal hittability - enhanced for iOS
    await this.centerTokenInViewport(token);

    // Then ensure the token is fully hittable - with platform-specific attempts
    await this.ensureTokenIsFullyHittable(token);

    // Now attempt to tap with aggressive retries - INCREASED for iOS
    const maxAttempts = device.getPlatform() === 'android' ? 5 : 7; // More attempts for iOS

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const elem = Matchers.getElementByText(
          token || WalletViewSelectorsText.DEFAULT_TOKEN,
          index,
        );

        // Add extra validation delay for iOS before tapping
        if (device.getPlatform() === 'ios') {
          await TestHelpers.delay(1000);
        }

        await Gestures.waitAndTap(elem, {
          elemDescription: 'Token',
        });

        // If tap succeeded, return
        return;
      } catch (e) {
        if (attempt < maxAttempts - 1) {
          // Re-center and re-ensure token is hittable before retrying - more aggressive for iOS
          await this.centerTokenInViewport(token);
          await this.ensureTokenIsFullyHittable(token);

          // Extra delay for iOS between attempts
          const retryDelay = device.getPlatform() === 'android' ? 1000 : 1500;
          await TestHelpers.delay(retryDelay);
        } else {
          throw new Error(
            `Failed to tap on token ${token} after ${maxAttempts} attempts on ${device.getPlatform()}: ${e}`,
          );
        }
      }
    }
  }

  async scrollToToken(
    tokenName: string,
    direction: 'up' | 'down' = 'down',
  ): Promise<void> {
    // REDIRECT to our new platform-specific methods instead of using problematic scrollToElement
    console.warn(
      `scrollToToken called for ${tokenName} - redirecting to new method`,
    );
    await this.ensureTokenIsFullyVisible(tokenName);
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
    await Gestures.waitAndTap(this.testCollectible, {
      elemDescription: 'NFT Name',
    });
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
    await Gestures.waitAndTap(this.sortBy, {
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
  get walletBuyButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_BUY_BUTTON);
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
}

export default new WalletView();
