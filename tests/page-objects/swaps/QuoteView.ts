import {
  Assertions,
  Gestures,
  Matchers,
  PlatformDetector,
  sleep,
  type EncapsulatedElementType,
} from '../../framework';
import { getAssetTestId } from '../../selectors/Wallet/WalletView.selectors';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
  getChainIdForNetwork,
} from '../../selectors/Bridge/QuoteView.selectors';

const TIMEOUT = {
  SWAP_SCREEN_VISIBLE: 10000,
  QUOTE_DISPLAYED: 30000,
  NETWORK_SELECT: 10000,
  TOKEN_SELECT: 30000,
  KEYPAD_DIGIT: 10000,
  /** Matches useSearchTokens debouncedSearch (300ms) + list settle. */
  TOKEN_SEARCH_SETTLE: 1000,
} as const;

class QuoteView {
  get selectAmountLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(QuoteViewSelectorText.SELECT_AMOUNT);
  }

  get confirmBridge(): EncapsulatedElementType {
    return Matchers.getElementByID(QuoteViewSelectorIDs.CONFIRM_BUTTON);
  }

  get confirmSwap(): EncapsulatedElementType {
    return Matchers.getElementByID(QuoteViewSelectorIDs.CONFIRM_BUTTON);
  }

  get sourceTokenArea(): EncapsulatedElementType {
    return Matchers.getElementByID(QuoteViewSelectorIDs.SOURCE_TOKEN_AREA);
  }

  get amountInput(): EncapsulatedElementType {
    return Matchers.getElementByID(QuoteViewSelectorIDs.SOURCE_TOKEN_INPUT);
  }

  get destinationTokenArea(): EncapsulatedElementType {
    return Matchers.getElementByID(QuoteViewSelectorIDs.DESTINATION_TOKEN_AREA);
  }

  get destinationTokenInput(): EncapsulatedElementType {
    return Matchers.getElementByID(
      QuoteViewSelectorIDs.DESTINATION_TOKEN_INPUT,
    );
  }

  get searchToken(): EncapsulatedElementType {
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByNativeXPath(
        `//*[@name='${QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT}' or @name='textfieldsearch' or contains(@label,'Enter token name') or contains(@name,'Enter token name')]`,
      );
    }
    return Matchers.getElementByID(QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT);
  }

  get seeAllButton(): EncapsulatedElementType {
    return Matchers.getElementByText(QuoteViewSelectorText.SELECT_ALL);
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(QuoteViewSelectorIDs.BACK_BUTTON);
  }

  get moreNetworksButton(): EncapsulatedElementType {
    return Matchers.getElementByID('network-pills-more-button');
  }

  get networkFeeLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(QuoteViewSelectorText.NETWORK_FEE);
  }

  get bridgeViewScroll(): EncapsulatedElementType {
    return Matchers.getElementByID(QuoteViewSelectorIDs.BRIDGE_VIEW_SCROLL);
  }

  /** Fee disclaimer (e.g. "Includes 0.875% MetaMask fee") - used for isQuoteDisplayed. */
  get feeDisclaimerLabel(): EncapsulatedElementType {
    return Matchers.getElementByID(
      QuoteViewSelectorIDs.PRICE_IMPACT_INFO_BUTTON,
    );
  }

  get keypadDeleteButton(): EncapsulatedElementType {
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByNativeXPath(
        `//*[contains(@name,'${QuoteViewSelectorIDs.KEYPAD_DELETE_BUTTON}')]`,
      );
    }
    return Matchers.getElementByID(QuoteViewSelectorIDs.KEYPAD_DELETE_BUTTON);
  }

  get maxLink(): EncapsulatedElementType {
    return Matchers.getElementByText(QuoteViewSelectorText.MAX);
  }

  get includedLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(QuoteViewSelectorText.INCLUDED);
  }

  get rateLabel(): EncapsulatedElementType {
    return Matchers.getElementByText(QuoteViewSelectorText.RATE);
  }

  /** Token selector testID - matches TokenSelectorItem's getAssetTestId(chainId-symbol). */
  getTokenElementId(chainId: string, symbol: string): string {
    return getAssetTestId(`${chainId}-${symbol}`);
  }

  getTokenElement(chainId: string, symbol: string): EncapsulatedElementType {
    const testId = this.getTokenElementId(chainId, symbol);
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByID(testId);
    }
    // Re-query via XPath each time — a fixed match can stay displayed:false
    // on iOS after search/list virtualization.
    return Matchers.getElementByNativeXPath(`//*[@name='${testId}']`);
  }

  async enterAmount(amount: string): Promise<void> {
    // iOS: keypad keys are not reliably found via accessibility-id / text;
    // use name XPath (same pattern as enterSourceTokenAmount).
    const isAndroid = PlatformDetector.isAndroid();
    for (const digit of amount.split('')) {
      const keyName = digit === '.' ? 'keypad-key-dot' : `keypad-key-${digit}`;
      const el = isAndroid
        ? Matchers.getElementByID(keyName)
        : Matchers.getElementByNativeXPath(`//*[contains(@name,'${keyName}')]`);
      await Assertions.expectElementToBeVisible(el, {
        timeout: TIMEOUT.KEYPAD_DIGIT,
        description: `Keypad digit ${digit} should be visible`,
      });
      await Gestures.waitAndTap(el, {
        checkForDisplayed: true,
        checkEnabled: true,
        delay: 1000,
        elemDescription: `Tapping on keyboard digit ${digit}`,
      });
    }
  }

  async tapSearchToken(): Promise<void> {
    await Gestures.waitAndTap(this.searchToken, {
      checkForDisplayed: true,
      checkEnabled: true,
      elemDescription: 'Tap on token search input element',
    });
  }

  async tapToken(chainId: string, symbol: string): Promise<void> {
    let tokenElement = this.getTokenElement(chainId, symbol);

    // Prefer waiting first. Forced scroll on a not-yet-displayed iOS search
    // hit burns maxScrolls against a stale element (CI fail).
    try {
      await Assertions.expectElementToBeVisible(tokenElement, {
        timeout: 5000,
        description: `Token ${symbol} visible without scroll`,
      });
    } catch {
      // Keyboard / FlatList clipping can leave rows displayed:false even
      // after search — force blur again, then wait.
      await Gestures.typeText(this.searchToken, '', {
        hideKeyboard: true,
        clearFirst: false,
        elemDescription: 'Dismiss keyboard after token search',
      }).catch(() => undefined);

      if (PlatformDetector.isAndroid()) {
        try {
          tokenElement = this.getTokenElement(chainId, symbol);
          await Gestures.scrollToElement(
            tokenElement,
            Matchers.scrollContainer(QuoteViewSelectorIDs.TOKEN_LIST),
            {
              direction: 'up',
              elemDescription: `Scroll to token symbol ${symbol}`,
            },
          );
        } catch {
          // Token may already be visible after search filters the list.
        }
      }
      tokenElement = this.getTokenElement(chainId, symbol);
      await Assertions.expectElementToBeVisible(tokenElement, {
        timeout: TIMEOUT.TOKEN_SELECT,
        description: `Token ${symbol} should be visible`,
      });
    }
    await Gestures.waitAndTap(tokenElement, {
      checkForDisplayed: true,
      checkEnabled: true,
      delay: 1000,
      elemDescription: `Select token symbol ${symbol}`,
    });
  }

  async typeSearchToken(symbol: string): Promise<void> {
    await Gestures.typeText(this.searchToken, symbol, {
      elemDescription: `Search Token with symbol ${symbol}`,
      hideKeyboard: true,
    });
    // Wait for BridgeTokenSelector debouncedSearch (300ms) + result settle.
    await sleep(TIMEOUT.TOKEN_SEARCH_SETTLE);
  }

  async selectToken(symbol: string, index: number = 1): Promise<void> {
    const token = Matchers.getElementByText(symbol, index);
    await Gestures.waitAndTap(token, {
      elemDescription: `Token with symbol ${symbol} at index ${index}`,
    });
  }

  async tapSourceToken(): Promise<void> {
    await Gestures.waitAndTap(this.sourceTokenArea, {
      elemDescription: 'Tap source asset picker',
    });
  }

  /**
   * Taps the source amount input to focus it and open the keypad (BottomSheet).
   * Use before enterAmount() when the keypad may be closed (e.g. after returning from token/network selection).
   */
  async tapSourceAmountInput(): Promise<void> {
    await Gestures.waitAndTap(this.amountInput, {
      checkForDisplayed: true,
      checkEnabled: true,
      delay: 1500,
      elemDescription: 'Tap source amount input to open keypad',
    });
  }

  async dismissKeypad(): Promise<void> {
    // Prefer the "Rate" label (not rate-arrow-button) when a quote is present —
    // tapping BRIDGE_VIEW_SCROLL can open QuoteSelectorView (swap providers).
    // When there is no quote (e.g. RWA geo-block), Rate is absent; fall back
    // to the scroll view so the keypad can still be dismissed.
    try {
      await Gestures.waitAndTap(this.rateLabel, {
        checkForDisplayed: true,
        checkEnabled: true,
        timeout: 5000,
        elemDescription: 'Tap rate label to dismiss keypad',
      });
    } catch {
      await Gestures.waitAndTap(this.bridgeViewScroll, {
        checkForDisplayed: true,
        checkEnabled: true,
        elemDescription: 'Tap bridge scroll view to dismiss keypad',
      });
    }
  }

  async tapDestinationToken(): Promise<void> {
    await Gestures.waitAndTap(this.destinationTokenArea, {
      checkForDisplayed: true,
      checkEnabled: true,
      delay: 1000,
      elemDescription: 'Tap destination asset picker',
    });
    // Confirm token selector opened — TextInput can lag behind navigation.
    await Assertions.expectElementToBeVisible(this.searchToken, {
      timeout: TIMEOUT.SWAP_SCREEN_VISIBLE,
      description:
        'Token search input visible after opening destination token picker',
    });
  }

  async tapSeeAll(): Promise<void> {
    await Gestures.waitAndTap(this.seeAllButton, {
      elemDescription: 'Tap on See all button',
    });
  }

  async swipeNetwork(network: string, percentage: number): Promise<void> {
    const networkElement = Matchers.getElementByText(network);
    await Gestures.swipe(networkElement, 'left', { speed: 'slow', percentage });
  }

  async selectNetwork(network: string): Promise<void> {
    // Best-effort only: some swap flows never expose "more networks". Prior
    // Appium path scrolled that control into view via scrollIntoViewFullyVisible
    // (no facade yet) — visibility wait is the closest safe substitute.
    try {
      await Assertions.expectElementToBeVisible(this.moreNetworksButton, {
        timeout: 2000,
        description: 'More networks control (optional)',
      });
    } catch {
      // Continue — the target network may already be visible without this control.
    }
    const networkElement = Matchers.getElementByText(network);
    await Assertions.expectElementToBeVisible(networkElement, {
      timeout: TIMEOUT.NETWORK_SELECT,
      description: `Network ${network} should be visible`,
    });
    await Gestures.waitAndTap(networkElement, {
      checkForDisplayed: true,
      checkEnabled: true,
      delay: 1000,
      elemDescription: `Select network ${network}`,
    });
  }

  async tapConfirmBridge(): Promise<void> {
    await Gestures.waitAndTap(this.confirmBridge, {
      elemDescription: 'Confirm bridge',
    });
  }

  async tapConfirmSwap(): Promise<void> {
    await Gestures.waitAndTap(this.confirmSwap, {
      delay: 1300,
      elemDescription: 'Confirm swap',
    });
  }

  async tapOnBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button on Quote View',
    });
  }

  async tapMax(): Promise<void> {
    await Gestures.waitAndTap(this.maxLink, {
      elemDescription: 'Tap Max link to use maximum balance',
    });
  }

  /**
   * Asserts the swap/bridge view is visible (BridgeScreen.isVisible equivalent).
   * Used by performance tests.
   */
  async isVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.amountInput, {
      timeout: TIMEOUT.SWAP_SCREEN_VISIBLE,
      description: 'Swap screen source token input should be visible',
    });
  }

  /**
   * Asserts the quote is displayed by verifying the destination token input
   * contains a numeric value (meaning a quote result has populated the field).
   */
  async isQuoteDisplayed(): Promise<void> {
    const timeout = TIMEOUT.QUOTE_DISPLAYED;
    const interval = 300;
    const start = Date.now();
    const el = (await this.destinationTokenInput) as {
      textContent: () => Promise<string>;
    };
    while (Date.now() - start < timeout) {
      const text = await el.textContent();
      if (text && /\d/.test(text) && parseFloat(text) > 0) {
        return;
      }
      await sleep(interval);
    }
    const finalText = await el.textContent();
    throw new Error(
      `Destination token input does not contain a numeric value after ${timeout}ms, got: "${finalText}"`,
    );
  }

  /**
   * Selects destination network and token (BridgeScreen.selectNetworkAndTokenTo equivalent).
   * Orchestrates tapDestinationToken, selectNetwork, tapToken. Supports Ethereum, Polygon, Solana.
   */
  async selectNetworkAndTokenTo(network: string, token: string): Promise<void> {
    await this.tapDestinationToken();
    if (network !== 'Ethereum') {
      await this.selectNetwork(network);
    }
    await this.typeSearchToken(token);
    const chainId = getChainIdForNetwork(network);
    await this.tapToken(chainId, token);
  }

  /**
   * Enters source token amount via keypad (BridgeScreen.enterSourceTokenAmount equivalent).
   */
  async enterSourceTokenAmount(amount: string): Promise<void> {
    await this.tapSourceAmountInput();
    await Gestures.waitAndTap(this.keypadDeleteButton, {
      checkForDisplayed: true,
      checkEnabled: true,
      delay: 1000,
      elemDescription: 'Clear source amount via keypad delete',
    });
    await this.enterAmount(amount);
  }

  /**
   * Gets the slippage display text element (e.g., "2.5%")
   * @param value - The slippage value to match (e.g., "2.5" for 2.5%)
   */
  slippageDisplayText(value: string): EncapsulatedElementType {
    return Matchers.getElementByText(`${value}%`);
  }

  /**
   * Verifies that the slippage value is displayed correctly in the quote view
   * @param value - The expected slippage value (e.g., "2.5" for 2.5%)
   */
  async verifySlippageDisplayed(value: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.slippageDisplayText(value), {
      timeout: TIMEOUT.SWAP_SCREEN_VISIBLE,
      description: `Slippage should display ${value}%`,
    });
  }

  /**
   * Waits for the RWA geo-restricted quote stream banner.
   */
  async checkRwaGeoRestrictedMessageIsDisplayed(): Promise<void> {
    const timeout = 60000;
    const message = QuoteViewSelectorText.RWA_GEO_RESTRICTED_MESSAGE;
    const banner = Matchers.getElementByID(
      QuoteViewSelectorIDs.NO_QUOTES_BANNER,
    );

    await Assertions.expectElementToBeVisible(banner, {
      timeout,
      description:
        'RWA geo-restricted banner should be visible on the swap screen',
    });

    // Same semantics as expectTextDisplayed with within: banner (exact text on banner).
    await Assertions.expectElementToHaveText(banner, message, {
      timeout,
      description: `RWA geo-restricted message "${message}" should be visible on the swap screen`,
    });
  }
}

export default new QuoteView();
