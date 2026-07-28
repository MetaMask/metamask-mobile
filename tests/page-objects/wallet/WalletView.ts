import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../../../app/components/Views/Wallet/WalletView.testIds';
import { EARN_TEST_IDS } from '../../../app/components/UI/Earn/constants/testIds';
import { CashGetMusdEmptyStateSelectors } from '../../../app/components/Views/Homepage/Sections/Cash/CashGetMusdEmptyState.testIds';
import { SECONDARY_BALANCE_BUTTON_TEST_ID } from '../../../app/components/UI/AssetElement/index.constants';
import Gestures from '../../framework/Gestures';
import UnifiedGestures from '../../framework/UnifiedGestures';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';
import Utilities from '../../framework/Utilities';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
  asDetoxElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { getAssetTestId } from '../../selectors/Wallet/WalletView.selectors';
import WalletHomeScroll from './WalletHomeScroll';
import { WalletHomeSections as WalletHomeSectionsBase } from './WalletHomeSections';

class WalletView extends WalletHomeSectionsBase {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_CONTAINER);
  }

  /**
   * Wallet header root — high in the Android view hierarchy (above scroll /
   * homepage sections). Appium uses resourceIdMatches so package-qualified
   * IDs resolve quickly without deep tree walks into token lists.
   */
  get headerRoot(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_HEADER_ROOT),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            WalletViewSelectorsIDs.WALLET_HEADER_ROOT,
            { exact: false },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            WalletViewSelectorsIDs.WALLET_HEADER_ROOT,
          ),
      },
    });
  }

  get walletScrollContainer(): string {
    return WalletHomeScroll.walletScrollContainer;
  }

  get walletScrollView(): EncapsulatedElementType {
    return WalletHomeScroll.walletScrollView;
  }

  get earnButton(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_BUTTON);
  }

  get accountIcon(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(WalletViewSelectorsIDs.ACCOUNT_ICON),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            WalletViewSelectorsIDs.ACCOUNT_ICON,
          ),
        ios: () =>
          PlaywrightMatchers.getElementByCatchAll(
            WalletViewSelectorsIDs.ACCOUNT_ICON,
          ),
      },
    });
  }

  get eyeSlashIcon(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.EYE_SLASH_ICON);
  }

  get hamburgerMenuButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON,
        ),
    });
  }

  get navbarNetworkText(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT);
  }

  get navbarNetworkPicker(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
    );
  }

  get navbarCardButton(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.CARD_BUTTON);
  }

  get importNFTButton(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON);
  }

  get importTokensButton(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON);
  }

  get totalBalance(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT,
        ),
    });
  }

  get accountNameLabelText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
          { exact: true },
        ),
    });
  }

  get accountName(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  async checkActiveAccount(
    expectedName: string,
    timeout = 10_000,
  ): Promise<void> {
    await PlaywrightAssertions.expectElementText(
      asPlaywrightElement(this.accountNameLabelText),
      expectedName,
      { timeout },
    );
  }

  get hideTokensLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.HIDE_TOKENS);
  }

  get currentMainWalletAccountActions(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
    );
  }

  get tokenNetworkFilter(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
  }

  get sortButton(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.SORT_BUTTON);
  }

  get carouselContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.CAROUSEL_CONTAINER);
  }

  get carouselProgressDots(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.CAROUSEL_PROGRESS_DOTS,
    );
  }
  get testCollectible(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TEST_COLLECTIBLE, 1);
  }
  get testCollectibleFallback(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.COLLECTIBLE_FALLBACK,
      1,
    );
  }
  // Wallet-specific action buttons (from AssetDetailsActions in Wallet view)
  get walletBuyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_BUY_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.WALLET_BUY_BUTTON,
          { exact: true },
        ),
    });
  }

  get walletSwapButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_SWAP_BUTTON),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            WalletViewSelectorsIDs.WALLET_SWAP_BUTTON,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            WalletViewSelectorsIDs.WALLET_SWAP_BUTTON,
          ),
      },
    });
  }

  get walletSendButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_SEND_BUTTON),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            WalletViewSelectorsIDs.WALLET_SEND_BUTTON,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            WalletViewSelectorsIDs.WALLET_SEND_BUTTON,
          ),
      },
    });
  }

  get musdAssetListConversionCta(): EncapsulatedElementType {
    return Matchers.getElementByID(
      EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA,
    );
  }

  get cashGetMusdContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(CashGetMusdEmptyStateSelectors.CONTAINER);
  }

  get getMusdButton(): EncapsulatedElementType {
    return Matchers.getElementByText('Get mUSD');
  }

  get getStartedButton(): EncapsulatedElementType {
    return Matchers.getElementByText('Get Started');
  }

  /** Token list item CTA: "Get 3% mUSD bonus" on USDC row. Use testID + index (1 = USDC after ETH) to avoid regex/text flakiness. */
  get tokenListItemConvertToMusdCta(): EncapsulatedElementType {
    return Matchers.getElementByID(SECONDARY_BALANCE_BUTTON_TEST_ID, 1);
  }

  get assetOverviewMusdCta(): EncapsulatedElementType {
    return Matchers.getElementByID(
      EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA,
    );
  }

  // Balance Empty State - displayed when account group has zero balance across all networks
  get balanceEmptyStateContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER,
    );
  }

  get balanceEmptyStateActionButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_ACTION_BUTTON,
    );
  }

  async tapCurrentMainWalletAccountActions(): Promise<void> {
    await Gestures.waitAndTap(this.currentMainWalletAccountActions, {
      elemDescription: 'Current Main Wallet Account Actions',
    });
  }

  tokenRow(token: string, index = 0): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(token, index),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(getAssetTestId(token), {
            exact: true,
          }),
        // iOS: match accessibilityIdentifier (= RN testID), not accessibilityLabel
        // (label is "Name, $fiat, balance" and does not contain asset-SYMBOL).
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(getAssetTestId(token)),
      },
    });
  }

  async tapOnToken(token: string, index = 0): Promise<void> {
    const tokenLabel = token || WalletViewSelectorsText.DEFAULT_TOKEN;
    await encapsulatedAction({
      detox: async () => {
        const elem = Matchers.getElementByText(tokenLabel, index);
        await Assertions.expectElementToBeVisible(elem, {
          description: `${tokenLabel} token in wallet list`,
        });
        // Wait for the token list to finish loading/reordering before tapping.
        // New tokens appearing asynchronously can shift positions mid-tap.
        await Utilities.waitForElementToStopMoving(elem, {
          timeout: 20000,
          interval: 500,
          stableCount: 6,
        });
        await Gestures.waitAndTap(elem, {
          elemDescription: 'Token',
        });
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.tokenRow(tokenLabel), {
          description: 'Token',
        });
      },
    });
  }

  async tapIdenticon(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.accountIcon, {
          elemDescription: 'Top Account Icon',
        });
      },
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.accountIcon),
        );
      },
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
      this.tokenInWallet(tokenName) as unknown as DetoxElement,
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

  async tokenInWallet(tokenName: string): Promise<EncapsulatedElementType> {
    return Matchers.getElementByText(tokenName);
  }

  async nftInWallet(nftName: string): Promise<EncapsulatedElementType> {
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

  get defiTab(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.DEFI_TAB);
  }

  get defiNetworkFilter(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
    );
  }

  get defiTabContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER,
    );
  }
  get claimButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictPositionsHeaderSelectorsIDs.CLAIM_BUTTON,
    );
  }
  get predictClaimConfirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictClaimConfirmationSelectorsIDs.CLAIM_CONFIRM_BUTTON,
    );
  }

  get availableBalanceLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.AVAILABLE_BALANCE);
  }

  get defiPositionsNew(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.DEFI_SECTION);
  }

  /** Perpetuals section title button on the homepage. */
  get perpsSectionHeader(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('perps'),
    );
  }

  /** Predictions section title button on the homepage. */
  get predictionsSectionHeader(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('predictions'),
    );
  }

  get getMoneySection(): EncapsulatedElementType {
    return PlaywrightMatchers.getElementById('homepage-section-title-cash', {
      exact: false,
    });
  }
  /** Tokens section header on the homepage. */
  get tokensSectionHeader(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.TOKENS_SECTION);
  }

  get tokensSection(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.TOKENS_SECTION_CONTAINER,
        ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('tokens'),
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            `${WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('tokens')}`,
          ),
      },
    });
  }

  /** NFTs section header on the homepage. */
  get nftsSectionHeader(): EncapsulatedElementType {
    return Matchers.getElementByText(WalletViewSelectorsText.NFTS_SECTION);
  }

  async tapOnTokensSection(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.tokensSectionHeader, {
          checkStability: true,
          elemDescription: 'Tokens Section',
        });
      },
      appium: async () => {
        const elem = await asPlaywrightElement(this.tokensSection);
        await PlaywrightGestures.waitForElementStable(elem);

        // Re-fetch to avoid stale reference after stability wait
        const freshElem = await asPlaywrightElement(this.tokensSection);
        await freshElem.unwrap().click();
      },
    });
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

  async scrollAndTapDefiSection(): Promise<void> {
    await this.scrollAndTapSection(this.defiPositionsNew, 'DeFi section');
  }

  async scrollAndTapPerpsSection(): Promise<void> {
    try {
      await this.scrollAndTapSection(
        this.perpsSectionHeader,
        'Perpetuals section',
      );
    } catch {
      await this.scrollAndTapSection(
        this.perpsSectionHeader,
        'Perpetuals section',
        'up',
      );
    }
  }

  /**
   * Scrolls to the Predictions section and taps it. After scroll, does a small overshoot swipe
   * so the section sits higher on screen and the tap does not hit the main menu "+" button.
   */
  async scrollAndTapPredictionsSection(
    direction: 'up' | 'down' = 'down',
    options: {
      overshootSwipe?: { direction: 'up' | 'down'; percentage?: number };
    } = {},
  ): Promise<void> {
    if (
      await this.tapIfAlreadyVisible(
        this.predictionsSectionHeader,
        'Predictions section',
      )
    ) {
      return;
    }

    const fallbackDirection = direction === 'down' ? 'up' : 'down';

    await this.tryScrollDirections(
      (scrollDirection) =>
        this.scrollAndTapSection(
          this.predictionsSectionHeader,
          'Predictions section',
          scrollDirection,
          {
            overshootSwipe: options.overshootSwipe ?? {
              direction:
                scrollDirection === 'down'
                  ? ('up' as const)
                  : ('down' as const),
              percentage: 0.15,
            },
            timeout: 60_000,
          },
        ),
      [direction, fallbackDirection],
    );
  }

  private async scrollPredictionsSectionIntoView(
    direction: 'up' | 'down' = 'down',
    options: { maxAttempts?: number } = {},
  ): Promise<void> {
    const { maxAttempts = 24 } = options;

    await encapsulatedAction({
      detox: async () => {
        await Gestures.scrollToElement(
          this.predictionsSectionHeader,
          this.walletScrollContainer,
          {
            direction,
            scrollAmount: 250,
            timeout: 60_000,
            elemDescription: 'Scroll to Predictions section',
          },
        );
      },
      appium: async () => {
        await this.scrollWalletHomeToElement(
          this.predictionsSectionHeader,
          'Predictions section',
          direction,
          maxAttempts,
        );
      },
    });
  }

  /**
   * Tries scroll actions down then up (or a custom order) without nested try/catch
   * at call sites. Rethrows the last failure if every direction fails.
   */
  private async tryScrollDirections(
    action: (direction: 'up' | 'down') => Promise<void>,
    directions: readonly ('up' | 'down')[] = ['down', 'up'],
  ): Promise<void> {
    let lastError: unknown;
    for (const direction of directions) {
      try {
        await action(direction);
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  async scrollAndTapPredictionsPosition(
    positionName: string,
    positionId?: string,
  ): Promise<void> {
    const target = positionId
      ? Matchers.getElementByID(`predict-position-row-${positionId}`)
      : Matchers.getElementByText(positionName);

    await encapsulatedAction({
      detox: async () => {
        if (
          await this.tapIfAlreadyVisible(
            target,
            `Predictions Position: ${positionName}`,
          )
        ) {
          return;
        }

        await this.tryScrollDirections((direction) =>
          this.scrollPredictionsSectionIntoView(direction),
        );

        if (
          await this.tapIfAlreadyVisible(
            target,
            `Predictions Position: ${positionName}`,
          )
        ) {
          return;
        }

        await this.tryScrollDirections((direction) =>
          this.scrollAndTapSection(
            target,
            `Predictions Position: ${positionName}`,
            direction,
            { timeout: 60_000 },
          ),
        );
      },
      appium: async () => {
        const description = `Predictions Position: ${positionName}`;
        const marketDetailsScreen = Matchers.getElementByID(
          PredictMarketDetailsSelectorsIDs.SCREEN,
        );
        // Keep one attempt well under half of the outer budget so
        // tryScrollDirections (down+up) can fail and still leave a second try.
        const scrollAndTapRetryTimeoutMs = 90_000;
        const intoViewMaxAttempts = 8;
        const scrollAndTapPerDirectionMs = 15_000;
        const tapTimeoutMs = 10_000;
        const predictNavigationTimeoutMs = resolveE2EWaitTimeoutMs(15_000);

        const assertMarketDetailsOpened = async (): Promise<void> => {
          await Assertions.expectElementToBeVisible(marketDetailsScreen, {
            timeout: predictNavigationTimeoutMs,
            description: 'Predict market details screen after position tap',
          });
        };

        // Align with Detox: tap-if-visible → section into view → tap →
        // scrollAndTap with overshoot (down/up). Do not require the row to be
        // visible before scrolling (off-screen rows like Blue Jays).
        await Utilities.executeWithRetry(
          async () => {
            if (
              await this.tapIfAlreadyVisible(target, description, {
                tapTimeout: tapTimeoutMs,
              })
            ) {
              await assertMarketDetailsOpened();
              return;
            }

            await this.tryScrollDirections((direction) =>
              this.scrollPredictionsSectionIntoView(direction, {
                maxAttempts: intoViewMaxAttempts,
              }),
            );

            if (
              await this.tapIfAlreadyVisible(target, description, {
                tapTimeout: tapTimeoutMs,
              })
            ) {
              await assertMarketDetailsOpened();
              return;
            }

            await this.tryScrollDirections((direction) =>
              this.scrollAndTapSection(target, description, direction, {
                timeout: scrollAndTapPerDirectionMs,
                tapTimeout: tapTimeoutMs,
                overshootSwipe: {
                  direction: direction === 'down' ? 'up' : 'down',
                  percentage: 0.15,
                },
              }),
            );

            await assertMarketDetailsOpened();
          },
          {
            timeout: scrollAndTapRetryTimeoutMs,
            description: `Scroll and tap ${description}`,
          },
        );
      },
    });
  }

  async scrollAndTapNftsSection(): Promise<void> {
    await this.scrollAndTapSection(this.nftsSectionHeader, 'NFTs section');
  }

  async tapOnAvailableBalance(): Promise<void> {
    await Gestures.waitAndTap(this.availableBalanceLabel, {
      elemDescription: 'tap available balance to expand balance card',
    });
  }

  async tapClaimButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.scrollToElement(
          this.claimButton,
          this.walletScrollContainer,
          {
            direction: 'down',
            scrollAmount: 200,
            elemDescription: 'Scroll to Claim Button',
          },
        );
        await Gestures.waitAndTap(this.claimButton, {
          elemDescription: 'Claim Button',
        });
      },
      appium: async () => {
        await Utilities.executeWithRetry(
          async () => {
            await this.scrollWalletHomeToElement(
              this.claimButton,
              'Claim button on wallet homepage',
            );
            await UnifiedGestures.waitAndTap(this.claimButton, {
              description: 'Claim Button',
              timeout: 30_000,
            });
          },
          {
            timeout: 90_000,
            description: 'Tap claim button on wallet homepage',
          },
        );
      },
    });
  }

  async tapClaimConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.predictClaimConfirmButton, {
      elemDescription: 'Claim confirm button',
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

    let result = '';
    await encapsulatedAction({
      appium: async () => {
        const startTime = Date.now();
        const isIOS = await PlatformDetector.isIOS();

        if (isIOS) {
          // iOS: Element lookups are extremely slow (15-30s each).
          // Skip stability loop and just wait for a valid balance once.
          let previousBalance = '';
          while (Date.now() - startTime < maxWaitTime) {
            try {
              const balanceEl = await asPlaywrightElement(this.totalBalance);
              const rawBalance = await balanceEl.textContent();
              const balance = (rawBalance || '').trim();
              previousBalance = balance;

              if (balance && balance !== '' && balance !== '$0.00') {
                result = balance;
                return;
              }
            } catch {
              // Element not found yet, retry
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
          result = previousBalance;
          return;
        }

        // Android: Fast element lookups, use stability polling
        let previousBalance = '';
        let sameResultStartTime: number | null = null;

        while (true) {
          if (Date.now() - startTime > maxWaitTime) {
            result = previousBalance;
            return;
          }

          let currentBalance: string;
          try {
            const balanceEl = await asPlaywrightElement(this.totalBalance);
            const rawBalance = await balanceEl.textContent();
            currentBalance = (rawBalance || '').trim();
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
              result = currentBalance;
              return;
            }
          } else {
            sameResultStartTime = Date.now();
            previousBalance = currentBalance;
          }

          await new Promise((r) => setTimeout(r, pollInterval));
        }
      },
    });
    return result;
  }

  // TODO test this
  async getBalanceText(): Promise<string> {
    const balanceElement = asDetoxElement(this.totalBalance);
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

  async tapWalletBuyButton(): Promise<void> {
    await Gestures.waitAndTap(this.walletBuyButton, {
      elemDescription: 'Wallet Buy Button',
    });
  }

  async tapWalletSwapButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.walletSwapButton, {
      description: 'Wallet Swap Button',
    });
  }

  async tapWalletSendButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.walletSendButton, {
      description: 'Wallet Send Button',
    });
  }

  async tapGetMusdButton(): Promise<void> {
    await Gestures.waitAndTap(this.getMusdButton, {
      elemDescription: 'Get mUSD button',
    });
  }

  async tapGetStartedButton(): Promise<void> {
    await Gestures.waitAndTap(this.getStartedButton, {
      elemDescription: 'Get Started button on education screen',
    });
  }

  /** Tap the "Get X% mUSD bonus" CTA on a token list row (visible when user has mUSD balance). Uses checkStability + delay so list is fully loaded before tap. */
  async tapTokenListItemConvertToMusdCta(): Promise<void> {
    await Gestures.waitAndTap(this.tokenListItemConvertToMusdCta, {
      checkStability: true,
      delay: 1000,
      elemDescription: 'Token list item mUSD conversion CTA',
    });
  }

  /**
   * Scrolls down on the Asset Overview screen until the mUSD conversion CTA is visible,
   * then asserts it is visible so the caller can safely tap. Uses the same scroll
   * container as the Asset/Transactions screen (transactions-container).
   */
  async scrollDownToAssetOverviewMusdCta(): Promise<void> {
    const assetOverviewScrollContainer = Matchers.scrollContainer(
      'transactions-container',
    );
    await Gestures.scrollToElement(
      this.assetOverviewMusdCta as unknown as DetoxElement,
      assetOverviewScrollContainer,
      {
        direction: 'down',
        scrollAmount: 200,
        elemDescription: 'Asset Overview mUSD CTA',
        timeout: 15000,
      },
    );
    await Assertions.expectElementToBeVisible(this.assetOverviewMusdCta, {
      timeout: 5000,
      description: 'Asset Overview mUSD CTA should be visible after scroll',
    });
  }

  async tapAssetOverviewMusdCta(): Promise<void> {
    await Gestures.waitAndTap(this.assetOverviewMusdCta, {
      checkStability: true,
      delay: 800,
      elemDescription: 'Asset Overview mUSD CTA',
    });
  }

  async tapBalanceEmptyStateActionButton(): Promise<void> {
    await Gestures.waitAndTap(this.balanceEmptyStateActionButton, {
      elemDescription: 'Balance Empty State Action Button',
    });
  }
}

export default new WalletView();
