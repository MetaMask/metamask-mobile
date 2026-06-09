import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../../../app/components/Views/Wallet/WalletView.testIds';
import { EARN_TEST_IDS } from '../../../app/components/UI/Earn/constants/testIds';
import { CashGetMusdEmptyStateSelectors } from '../../../app/components/Views/Homepage/Sections/Cash/CashGetMusdEmptyState.testIds';
import { SECONDARY_BALANCE_BUTTON_TEST_ID } from '../../../app/components/UI/AssetElement/index.constants';
import {
  PredictPositionsHeaderSelectorsIDs,
  PredictPositionSelectorsIDs,
  PredictClaimConfirmationSelectorsIDs,
  PredictHomeSelectorsIDs,
} from '../../../app/components/UI/Predict/Predict.testIds';
import UnifiedGestures from '../../framework/UnifiedGestures';
import Matchers from '../../framework/Matchers';
import TestHelpers from '../../helpers.js';
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
import { PlatformDetector } from '../../framework/PlatformLocator';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import { getAssetTestId } from '../../selectors/Wallet/WalletView.selectors';

class WalletView {
  static readonly MAX_SCROLL_ITERATIONS = 4;

  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_CONTAINER),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            WalletViewSelectorsIDs.WALLET_CONTAINER,
            {
              exact: true,
            },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            WalletViewSelectorsIDs.EYE_SLASH_ICON,
          ),
      },
    });
  }

  /** Matcher for the wallet homepage ScrollView (same pattern as other scroll containers). */
  get walletScrollViewIdentifier(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(WalletViewSelectorsIDs.WALLET_SCROLL_VIEW);
  }

  /** Wallet ScrollView as element (for gestures like swipe). */
  get walletScrollView(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_SCROLL_VIEW),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.WALLET_SCROLL_VIEW,
        ),
    });
  }

  /**
   * Progressive scroll for homepage sections:
   * try tap -> small scroll down -> retry, until the section is tappable.
   * @param options.scrollAmount - Pixels to scroll per step.
   * @param options.overshootSwipe - After scroll, perform a small swipe to move the section away
   * from the tab bar (e.g. direction 'up' = one more scroll down = section moves higher on screen).
   */
  private async scrollAndTapSection(
    target: EncapsulatedElementType,
    description: string,
    direction: 'up' | 'down' = 'down',
    options: {
      scrollAmount?: number;
      overshootSwipe?: { direction: 'up' | 'down'; percentage?: number };
    } = {},
  ): Promise<void> {
    const { scrollAmount = 200, overshootSwipe } = options;
    await UnifiedGestures.scrollToElement(
      target,
      this.walletScrollViewIdentifier,
      {
        direction,
        scrollAmount,
        elemDescription: `Scroll to ${description}`,
      },
    );
    if (overshootSwipe) {
      await UnifiedGestures.swipe(
        this.walletScrollView,
        overshootSwipe.direction,
        {
          percentage: overshootSwipe.percentage ?? 0.15,
          speed: 'slow',
          elemDescription: `Overshoot swipe for ${description}`,
        },
      );
    }
    await UnifiedGestures.waitAndTap(target, {
      elemDescription: description,
    });
  }

  get earnButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(WalletViewSelectorsIDs.STAKE_BUTTON),
    });
  }

  /**
   * The "Earn" CTA on the USDC token row's secondary balance area.
   * Index 2 = USDC (third token: ETH → mUSD → USDC) in the standard lending fixture.
   */
  get lendingEarnCta(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SECONDARY_BALANCE_BUTTON_TEST_ID, 2),
      appium: () =>
        PlaywrightMatchers.getElementById(SECONDARY_BALANCE_BUTTON_TEST_ID),
    });
  }

  get stakedEthereumLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(WalletViewSelectorsText.STAKED_ETHEREUM),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          WalletViewSelectorsText.STAKED_ETHEREUM,
        ),
    });
  }

  get stakeMoreButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_MORE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.STAKE_MORE_BUTTON,
        ),
    });
  }

  get tokenDetectionLinkButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.WALLET_TOKEN_DETECTION_LINK_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.WALLET_TOKEN_DETECTION_LINK_BUTTON,
        ),
    });
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
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.EYE_SLASH_ICON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.EYE_SLASH_ICON,
        ),
    });
  }

  get notificationBellIcon(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.WALLET_NOTIFICATIONS_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.WALLET_NOTIFICATIONS_BUTTON,
        ),
    });
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
          { exact: true },
        ),
    });
  }

  get navbarNetworkText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT,
        ),
    });
  }

  get navbarNetworkButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.NAVBAR_NETWORK_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
          { exact: true },
        ),
    });
  }

  get navbarNetworkPicker(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER,
        ),
    });
  }

  get navbarCardButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(WalletViewSelectorsIDs.CARD_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(WalletViewSelectorsIDs.CARD_BUTTON),
    });
  }

  get nftTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(WalletViewSelectorsText.NFTS_TAB),
      appium: () =>
        PlaywrightMatchers.getElementByText(WalletViewSelectorsText.NFTS_TAB),
    });
  }

  get nftTabContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.NFT_TAB_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.NFT_TAB_CONTAINER,
        ),
    });
  }

  get importNFTButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_NFT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
        ),
    });
  }

  get importTokensButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON,
        ),
    });
  }

  get networkName(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(WalletViewSelectorsIDs.NETWORK_NAME),
      appium: () =>
        PlaywrightMatchers.getElementById(WalletViewSelectorsIDs.NETWORK_NAME),
    });
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
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
        ),
    });
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

  get accountNameLabelInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_INPUT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_INPUT,
          { exact: true },
        ),
    });
  }

  get hideTokensLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(WalletViewSelectorsText.HIDE_TOKENS),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          WalletViewSelectorsText.HIDE_TOKENS,
        ),
    });
  }

  get currentMainWalletAccountActions(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT,
        ),
    });
  }

  get tokenNetworkFilter(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER,
        ),
    });
  }

  get sortButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(WalletViewSelectorsIDs.SORT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(WalletViewSelectorsIDs.SORT_BUTTON),
    });
  }

  get sortBy(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(WalletViewSelectorsIDs.SORT_BY),
      appium: () =>
        PlaywrightMatchers.getElementById(WalletViewSelectorsIDs.SORT_BY),
    });
  }

  get tokenNetworkFilterAll(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_ALL,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_ALL,
        ),
    });
  }

  get tokenNetworkFilterCurrent(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_CURRENT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER_CURRENT,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Cancel'),
      appium: () => PlaywrightMatchers.getElementByText('Cancel'),
    });
  }

  get carouselContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.CAROUSEL_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.CAROUSEL_CONTAINER,
        ),
    });
  }

  get carouselProgressDots(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.CAROUSEL_PROGRESS_DOTS),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.CAROUSEL_PROGRESS_DOTS,
        ),
    });
  }
  get testCollectible(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.TEST_COLLECTIBLE, 1),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.TEST_COLLECTIBLE,
        ),
    });
  }
  get testCollectibleFallback(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.COLLECTIBLE_FALLBACK, 1),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.COLLECTIBLE_FALLBACK,
        ),
    });
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

  get walletBridgeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_BRIDGE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.WALLET_BRIDGE_BUTTON,
        ),
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

  // mUSD conversion (Earn) - asset list CTA, education screen, token list CTA, asset overview CTA
  get musdConversionCta(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA,
        ),
    });
  }

  get cashGetMusdContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(CashGetMusdEmptyStateSelectors.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          CashGetMusdEmptyStateSelectors.CONTAINER,
        ),
    });
  }

  get getMusdButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Get mUSD'),
      appium: () => PlaywrightMatchers.getElementByText('Get mUSD'),
    });
  }

  get getStartedButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Get Started'),
      appium: () => PlaywrightMatchers.getElementByText('Get Started'),
    });
  }

  /** Token list item CTA: "Get 3% mUSD bonus" on USDC row. Use testID + index (1 = USDC after ETH) to avoid regex/text flakiness. */
  get tokenListItemConvertToMusdCta(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SECONDARY_BALANCE_BUTTON_TEST_ID, 1),
      appium: () =>
        PlaywrightMatchers.getElementById(SECONDARY_BALANCE_BUTTON_TEST_ID),
    });
  }

  get assetOverviewMusdCta(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA,
        ),
    });
  }

  get walletReceiveButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.WALLET_RECEIVE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.WALLET_RECEIVE_BUTTON,
        ),
    });
  }
  // Balance Empty State - displayed when account group has zero balance across all networks
  get balanceEmptyStateContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER,
        ),
    });
  }

  get balanceEmptyStateActionButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_ACTION_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_ACTION_BUTTON,
        ),
    });
  }
  getPredictCurrentPositionCardByIndex(index: number = 0): DetoxElement {
    return Matchers.getElementByID(
      PredictPositionSelectorsIDs.CURRENT_POSITION_CARD,
      index,
    );
  }

  getPredictResolvedPositionCardByIndex(index: number = 0): DetoxElement {
    return Matchers.getElementByID(
      PredictPositionSelectorsIDs.RESOLVED_POSITION_CARD,
      index,
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
    await UnifiedGestures.waitAndTap(this.currentMainWalletAccountActions, {
      elemDescription: 'Current Main Wallet Account Actions',
    });
  }

  async longPressAccountNameLabel(): Promise<void> {
    await UnifiedGestures.longPress(this.accountNameLabelText, {
      description: 'Account name label',
    });
  }

  async editAccountNameLabel(text: string): Promise<void> {
    await UnifiedGestures.typeText(this.accountNameLabelInput, text, {
      description: 'Account name label input',
    });
  }

  async waitForTokenToBeReady(text: string, index = 0): Promise<DetoxElement> {
    const elem = Matchers.getElementByText(text, index);
    await Assertions.expectElementToBeVisible(elem, {
      description: `${text} token in wallet list`,
    });
    return await Utilities.waitForReadyState(elem, {
      elemDescription: `Token with text ${text} at index ${index}`,
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
        // iOS: TokenListItem sets accessibilityLabel to "Name, $fiat, balance"
        // so the iOS predicate `name` (= accessibilityLabel) differs from testID.
        // Use `~testID` which maps to accessibilityIdentifier (= testID).
        ios: () =>
          PlaywrightMatchers.getElementByNameiOS(getAssetTestId(token)),
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
        await UnifiedGestures.waitAndTap(elem, {
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
        await UnifiedGestures.waitAndTap(this.accountIcon, {
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

  async tapBellIcon(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.notificationBellIcon, {
      elemDescription: 'Notification Bell Icon',
    });
  }

  async tapHamburgerMenu(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.hamburgerMenuButton, {
      elemDescription: 'Hamburger Menu Button',
    });
  }

  async tapNetworksButtonOnNavBar(): Promise<void> {
    await TestHelpers.tap(WalletViewSelectorsIDs.NAVBAR_NETWORK_BUTTON);
  }

  async tapNavbarCardButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.navbarCardButton, {
      elemDescription: 'Card Button on Navbar',
    });
  }

  async tapNftTab(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.nftTab);
  }

  async scrollDownOnNFTsTab(): Promise<void> {
    await UnifiedGestures.swipe(this.nftTabContainer, 'up', {
      speed: 'slow',
      percentage: 0.4,
    });
  }

  async scrollToBottomOfTokensList(): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();
    for (let i = 0; i < WalletView.MAX_SCROLL_ITERATIONS; i++) {
      await UnifiedGestures.swipe(
        tokensContainer as unknown as DetoxElement,
        'up',
        {
          speed: 'fast',
          percentage: 0.7,
        },
      );
    }
  }

  async scrollToTopOfTokensList(): Promise<void> {
    const tokensContainer = await this.getTokensInWallet();
    await UnifiedGestures.swipe(
      tokensContainer as unknown as DetoxElement,
      'down',
      {
        speed: 'fast',
        percentage: 0.7,
      },
    );
  }

  async scrollToToken(
    tokenName: string,
    direction: 'up' | 'down' = 'down',
  ): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.tokenInWallet(tokenName) as unknown as DetoxElement,
      Matchers.getIdentifier(WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST),
      {
        direction,
        scrollAmount: 50,
      },
    );
  }

  async scrollUpOnNFTsTab(): Promise<void> {
    await UnifiedGestures.swipe(this.nftTabContainer, 'down', {
      speed: 'slow',
      percentage: 0.4,
    });
  }

  async tapImportNFTButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.importNFTButton, {
      elemDescription: 'Import NFT Button',
    });
  }

  async tapOnNftName(): Promise<void> {
    try {
      await UnifiedGestures.waitAndTap(this.testCollectible, {
        elemDescription: 'NFT Name',
      });
    } catch {
      await UnifiedGestures.waitAndTap(this.testCollectibleFallback, {
        elemDescription: 'NFT Name Fallback',
      });
    }
  }

  async tapImportTokensButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.importTokensButton, {
      elemDescription: 'Import Tokens Button',
    });
  }

  async tapOnNFTInWallet(nftName: string): Promise<void> {
    const elem = Matchers.getElementByText(nftName);
    await UnifiedGestures.waitAndTap(elem, {
      elemDescription: 'NFT Name',
    });
  }

  async removeTokenFromWallet(token: string): Promise<void> {
    const elem = Matchers.getElementByText(token);
    await UnifiedGestures.longPress(elem, {
      elemDescription: 'Long Pressing Token',
    });
    await UnifiedGestures.waitAndTap(this.hideTokensLabel, {
      elemDescription: 'Hide Tokens Label',
    });
  }

  async tokenInWallet(tokenName: string): Promise<EncapsulatedElementType> {
    return Matchers.getElementByText(tokenName);
  }

  async getTokensInWallet(): Promise<EncapsulatedElementType> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST,
    );
  }

  async nftIDInWallet(nftId: string): Promise<EncapsulatedElementType> {
    return Matchers.getElementByID(nftId);
  }

  async nftInWallet(nftName: string): Promise<EncapsulatedElementType> {
    return Matchers.getElementByText(nftName);
  }

  async tapNewTokensFound(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tokenDetectionLinkButton, {
      elemDescription: 'New Tokens Found Button',
    });
  }

  async tapTokenNetworkFilter(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tokenNetworkFilter, {
      elemDescription: 'Token Network Filter',
    });
  }

  async tapSortBy(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.sortButton, {
      elemDescription: 'Sort By',
    });
  }

  async tapTokenNetworkFilterAll(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tokenNetworkFilterAll, {
      elemDescription: 'Token Network Filter All',
    });
  }

  async tapTokenNetworkFilterCurrent(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tokenNetworkFilterCurrent, {
      elemDescription: 'Token Network Filter Current',
    });
  }

  async tapOnEarnButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.earnButton, {
      elemDescription: 'Earn Button',
    });
  }

  async tapOnStakedEthereum(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.stakedEthereumLabel, {
      elemDescription: 'Staked Ethereum Label',
    });
  }

  async tapOnStakeMore(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.stakeMoreButton, {
      elemDescription: 'Stake More Button',
    });
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel Button',
    });
  }

  /**
   * Swipes the carousel in the specified direction.
   * @param {'left' | 'right'} direction - The direction to swipe ('left' or 'right').
   */
  async swipeCarousel(direction: 'left' | 'right'): Promise<void> {
    await UnifiedGestures.swipe(this.carouselContainer, direction, {
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
    await UnifiedGestures.tap(this.getCarouselSlideCloseButton(id), {
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
    await UnifiedGestures.tap(this.getCarouselSlide(id), {
      elemDescription: `tap carousel slide ${id}`,
    });
  }

  get defiTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(WalletViewSelectorsText.DEFI_TAB),
      appium: () =>
        PlaywrightMatchers.getElementByText(WalletViewSelectorsText.DEFI_TAB),
    });
  }

  get defiNetworkFilter(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
        ),
    });
  }

  get defiTabContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER,
        ),
    });
  }
  get claimButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PredictPositionsHeaderSelectorsIDs.CLAIM_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictPositionsHeaderSelectorsIDs.CLAIM_BUTTON,
        ),
    });
  }
  get predictClaimConfirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PredictClaimConfirmationSelectorsIDs.CLAIM_CONFIRM_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictClaimConfirmationSelectorsIDs.CLAIM_CONFIRM_BUTTON,
        ),
    });
  }
  get predictScrollViewIdentifier() {
    return Matchers.getIdentifier(PredictHomeSelectorsIDs.SCROLL_VIEW);
  }

  get defiPositionDetailsContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER,
        ),
    });
  }

  get predictionsTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByLabel(WalletViewSelectorsText.PREDICTIONS_TAB),
      appium: () =>
        PlaywrightMatchers.getElementByAccessibilityId(
          WalletViewSelectorsText.PREDICTIONS_TAB,
        ),
    });
  }

  get PredictionsTabContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(PredictHomeSelectorsIDs.SCROLL_VIEW),
      appium: () =>
        PlaywrightMatchers.getElementById(PredictHomeSelectorsIDs.SCROLL_VIEW),
    });
  }

  get availableBalanceLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(WalletViewSelectorsText.AVAILABLE_BALANCE),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          WalletViewSelectorsText.AVAILABLE_BALANCE,
        ),
    });
  }

  get defiPositionsNew(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(WalletViewSelectorsText.DEFI_SECTION),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          WalletViewSelectorsText.DEFI_SECTION,
        ),
    });
  }

  /** Perpetuals section title button on the homepage. */
  get perpsSectionHeader(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByLabel(WalletViewSelectorsText.PERPETUALS_SECTION),
      appium: () =>
        PlaywrightMatchers.getElementByAccessibilityId(
          WalletViewSelectorsText.PERPETUALS_SECTION,
        ),
    });
  }

  /** Predictions section title button on the homepage. */
  get predictionsSectionHeader(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('predictions'),
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('predictions'),
        ),
    });
  }

  /** Tokens section header on the homepage. */
  get tokensSectionHeader(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(WalletViewSelectorsText.TOKENS_SECTION),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          WalletViewSelectorsText.TOKENS_SECTION,
        ),
    });
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
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(WalletViewSelectorsText.NFTS_SECTION),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          WalletViewSelectorsText.NFTS_SECTION,
        ),
    });
  }

  async tapOnNewTokensSection(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tokensSectionHeader, {
      checkStability: true,
      elemDescription: 'New Tokens Section',
    });
  }

  async tapOnTokensSection(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await UnifiedGestures.waitAndTap(this.tokensSectionHeader, {
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
    await UnifiedGestures.waitAndTap(this.defiTab, {
      elemDescription: 'DeFi Tab',
    });
  }

  async tapOnDeFiNetworksFilter(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.defiNetworkFilter, {
      elemDescription: 'DeFi Networks Filter',
    });
  }

  async tapOnDeFiPosition(positionName: string): Promise<void> {
    const elem = Matchers.getElementByText(positionName);
    await UnifiedGestures.waitAndTap(elem, {
      elemDescription: 'DeFi Position',
    });
  }

  async tapOnPredictionsTab(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.predictionsTab, {
      elemDescription: 'Predictions Tab',
    });
  }

  async tapOnPredictionsPosition(positionName: string): Promise<void> {
    const elem = Matchers.getElementByText(positionName);
    await this.scrollAndTapSection(
      elem,
      `Predictions Position: ${positionName}`,
    );
  }

  async scrollDownOnPredictionsTab(): Promise<void> {
    await UnifiedGestures.swipe(this.PredictionsTabContainer, 'up', {
      speed: 'slow',
      percentage: 0.4,
    });
  }

  async scrollUpOnPredictionsTab(): Promise<void> {
    await UnifiedGestures.swipe(this.PredictionsTabContainer, 'down', {
      speed: 'slow',
      percentage: 0.4,
    });
  }

  async scrollToPosition(
    positionName: string,
    direction: 'up' | 'down' = 'down',
  ): Promise<void> {
    const positionElement = (await Matchers.getElementByText(
      positionName,
    )) as unknown as DetoxElement;
    await UnifiedGestures.scrollToElement(
      positionElement,
      this.predictScrollViewIdentifier,
      { direction },
    );
  }

  async scrollAndTapDefiSection(): Promise<void> {
    await this.scrollAndTapSection(this.defiPositionsNew, 'DeFi section');
  }

  async scrollAndTapPerpsSection(): Promise<void> {
    await this.scrollAndTapSection(
      this.perpsSectionHeader,
      'Perpetuals section',
    );
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
    const getScrollOptions = (scrollDirection: 'up' | 'down') => ({
      overshootSwipe: options.overshootSwipe ?? {
        direction:
          scrollDirection === 'down' ? ('up' as const) : ('down' as const),
        percentage: 0.15,
      },
    });

    try {
      await this.scrollAndTapSection(
        this.predictionsSectionHeader,
        'Predictions section',
        direction,
        getScrollOptions(direction),
      );
    } catch {
      const fallbackDirection = direction === 'down' ? 'up' : 'down';
      await this.scrollAndTapSection(
        this.predictionsSectionHeader,
        'Predictions section',
        fallbackDirection,
        getScrollOptions(fallbackDirection),
      );
    }
  }

  async scrollAndTapPredictionsPosition(positionName: string): Promise<void> {
    const target = Matchers.getElementByText(positionName);
    try {
      await UnifiedGestures.scrollToElement(
        target,
        this.walletScrollViewIdentifier,
        {
          direction: 'down',
          scrollAmount: 220,
          timeout: 12000,
          elemDescription: `Scroll to prediction position: ${positionName}`,
        },
      );
    } catch {
      await UnifiedGestures.scrollToElement(
        target,
        this.walletScrollViewIdentifier,
        {
          direction: 'up',
          scrollAmount: 220,
          timeout: 12000,
          elemDescription: `Scroll up fallback to prediction position: ${positionName}`,
        },
      );
    }

    await UnifiedGestures.waitAndTap(target, {
      checkStability: true,
      elemDescription: `Predictions Position: ${positionName}`,
    });
  }

  async scrollAndTapNftsSection(): Promise<void> {
    await this.scrollAndTapSection(this.nftsSectionHeader, 'NFTs section');
  }

  async tapOnAvailableBalance(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.availableBalanceLabel, {
      elemDescription: 'tap available balance to expand balance card',
    });
  }

  async tapClaimButton(): Promise<void> {
    await UnifiedGestures.scrollToElement(
      this.claimButton,
      this.walletScrollViewIdentifier,
      {
        direction: 'down',
        scrollAmount: 200,
        elemDescription: 'Scroll to Claim Button',
      },
    );
    await UnifiedGestures.waitAndTap(this.claimButton, {
      elemDescription: 'Claim Button',
    });
  }

  async tapClaimConfirmButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.predictClaimConfirmButton, {
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
    await UnifiedGestures.waitAndTap(this.eyeSlashIcon, {
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
    await UnifiedGestures.waitAndTap(this.walletBuyButton, {
      elemDescription: 'Wallet Buy Button',
    });
  }

  async waitForScreenToDisplay(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(this.container, {
          timeout: 30000,
          description: 'Wallet view should be visible',
        });
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(this.walletSwapButton),
          {
            timeout: 30000,
            description: 'Wallet swap button should be visible',
          },
        );
      },
    });
  }

  async tapWalletSwapButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.walletSwapButton, {
      description: 'Wallet Swap Button',
    });
  }

  async tapWalletBridgeButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.walletBridgeButton, {
      elemDescription: 'Wallet Bridge Button',
    });
  }

  async tapWalletSendButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.walletSendButton, {
      description: 'Wallet Send Button',
    });
  }

  async tapGetMusdButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getMusdButton, {
      elemDescription: 'Get mUSD button',
    });
  }

  async tapGetStartedButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getStartedButton, {
      elemDescription: 'Get Started button on education screen',
    });
  }

  /** Tap the "Get X% mUSD bonus" CTA on a token list row (visible when user has mUSD balance). Uses checkStability + delay so list is fully loaded before tap. */
  async tapTokenListItemConvertToMusdCta(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tokenListItemConvertToMusdCta, {
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
    const assetOverviewScrollContainer = Matchers.getIdentifier(
      'transactions-container',
    );
    await UnifiedGestures.scrollToElement(
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
    await UnifiedGestures.waitAndTap(this.assetOverviewMusdCta, {
      checkStability: true,
      delay: 800,
      elemDescription: 'Asset Overview mUSD CTA',
    });
  }

  async tapWalletReceiveButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.walletReceiveButton, {
      elemDescription: 'Wallet Receive Button',
    });
  }

  get perpsTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(WalletViewSelectorsText.PERPS_TAB),
      appium: () =>
        PlaywrightMatchers.getElementByText(WalletViewSelectorsText.PERPS_TAB),
    });
  }

  async tapOnPerpsTab(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.perpsTab, {
      elemDescription: 'Perps Tab Button',
    });
  }

  async verifyTokenNetworkFilterText(expectedText: string): Promise<void> {
    await Assertions.expectElementToHaveLabel(
      asDetoxElement(this.tokenNetworkFilter),
      expectedText,
      {
        description: `token network filter should display "${expectedText}"`,
      },
    );
  }

  async tapBalanceEmptyStateActionButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.balanceEmptyStateActionButton, {
      elemDescription: 'Balance Empty State Action Button',
    });
  }

  async tapPredictPosition(positionName: string): Promise<void> {
    const position = Matchers.getElementByText(positionName);

    await UnifiedGestures.waitAndTap(position, {
      elemDescription: `Tapping Prediction position ${positionName}`,
    });
  }
}

export default new WalletView();
