import { waitFor } from 'detox';
import {
  Assertions,
  Gestures,
  Matchers,
  PlaywrightAssertions,
  PlaywrightMatchers,
  UnifiedGestures,
  encapsulated,
  encapsulatedAction,
  asDetoxElement,
  asPlaywrightElement,
  type EncapsulatedElementType,
  PlaywrightGestures,
  PlatformDetector,
  PlaywrightElement,
  sleep,
} from '../../framework';
import { getAssetTestId } from '../../selectors/Wallet/WalletView.selectors';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
  getChainIdForNetwork,
} from '../../selectors/Bridge/QuoteView.selectors';

const TIMEOUT = {
  SWAP_SCREEN_VISIBLE: 10000,
  TOKEN_EXISTS_BEFORE_SCROLL: 15000,
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
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(QuoteViewSelectorIDs.SOURCE_TOKEN_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          QuoteViewSelectorIDs.SOURCE_TOKEN_INPUT,
          { exact: true },
        ),
    });
  }

  get destinationTokenArea(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(QuoteViewSelectorIDs.DESTINATION_TOKEN_AREA),
      appium: () =>
        PlaywrightMatchers.getElementById(
          QuoteViewSelectorIDs.DESTINATION_TOKEN_AREA,
          { exact: true },
        ),
    });
  }

  get destinationTokenInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(QuoteViewSelectorIDs.DESTINATION_TOKEN_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          QuoteViewSelectorIDs.DESTINATION_TOKEN_INPUT,
          { exact: true },
        ),
    });
  }

  get searchToken(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            `//*[@name='${QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT}' or @name='textfieldsearch' or contains(@label,'Enter token name') or contains(@name,'Enter token name')]`,
          ),
      },
    });
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
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(QuoteViewSelectorIDs.BRIDGE_VIEW_SCROLL),
      appium: () =>
        PlaywrightMatchers.getElementById(
          QuoteViewSelectorIDs.BRIDGE_VIEW_SCROLL,
          { exact: true },
        ),
    });
  }

  /** Fee disclaimer (e.g. "Includes 0.875% MetaMask fee") - used for isQuoteDisplayed. */
  get feeDisclaimerLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(QuoteViewSelectorIDs.PRICE_IMPACT_INFO_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          QuoteViewSelectorIDs.PRICE_IMPACT_INFO_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  get keypadDeleteButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(QuoteViewSelectorIDs.KEYPAD_DELETE_BUTTON),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            QuoteViewSelectorIDs.KEYPAD_DELETE_BUTTON,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            `//*[contains(@name,'${QuoteViewSelectorIDs.KEYPAD_DELETE_BUTTON}')]`,
          ),
      },
    });
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

  token(chainId: string, symbol: string): Detox.NativeElement {
    return element(by.id(this.getTokenElementId(chainId, symbol))).atIndex(0);
  }

  async enterAmount(amount: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        for (const digit of amount) {
          const button = Matchers.getElementByText(digit);
          await Gestures.waitAndTap(button, {
            elemDescription: `Tapping on keyboard digit ${digit}`,
          });
        }
      },
      appium: async () => {
        // iOS: keypad keys are not reliably found via accessibility-id / text;
        // use name XPath (same pattern as enterSourceTokenAmount).
        const isAndroid = await PlatformDetector.isAndroid();
        for (const digit of amount.split('')) {
          const keyName =
            digit === '.' ? 'keypad-key-dot' : `keypad-key-${digit}`;
          const el = isAndroid
            ? await PlaywrightMatchers.getElementById(keyName, {
                exact: true,
              })
            : await PlaywrightMatchers.getElementByXPath(
                `//*[contains(@name,'${keyName}')]`,
              );
          await PlaywrightAssertions.expectElementToBeVisible(el, {
            timeout: TIMEOUT.KEYPAD_DIGIT,
            description: `Keypad digit ${digit} should be visible`,
          });
          await PlaywrightGestures.waitAndTap(el, {
            checkForDisplayed: true,
            checkForEnabled: true,
            delay: 1000,
          });
        }
      },
    });
  }

  async tapSearchToken(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(asDetoxElement(this.searchToken), {
          elemDescription: 'Tap on token search input element',
        });
      },
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.searchToken),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
          },
        );
      },
    });
  }

  async tapToken(chainId: string, symbol: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const tokenElement = this.token(chainId, symbol);
        await waitFor(tokenElement)
          .toExist()
          .withTimeout(TIMEOUT.TOKEN_EXISTS_BEFORE_SCROLL);
        await Gestures.scrollToElement(
          tokenElement as unknown as DetoxElement,
          Matchers.getIdentifier(QuoteViewSelectorIDs.TOKEN_LIST),
          {
            direction: 'down',
            scrollAmount: 350,
            elemDescription: `Scroll to token symbol ${symbol}`,
          },
        );
        await Gestures.waitAndTap(tokenElement as unknown as DetoxElement, {
          delay: 1000,
          elemDescription: `Select token symbol ${symbol}`,
        });
      },
      appium: async () => {
        const testId = this.getTokenElementId(chainId, symbol);
        const isAndroid = await PlatformDetector.isAndroid();
        const resolveToken = async (): Promise<PlaywrightElement> => {
          if (isAndroid) {
            return PlaywrightMatchers.getElementById(testId, {
              exact: false,
            });
          }
          // Lazy xpath re-queries each poll — a fixed $$ match can stay
          // displayed:false on iOS after search/list virtualization.
          return PlaywrightMatchers.getLazyElementByXPath(
            `//*[@name='${testId}']`,
          );
        };

        let tokenElement = await resolveToken();

        // Prefer waiting first. Forced scrollIntoView on a not-yet-displayed
        // iOS search hit burns maxScrolls against a stale element (CI fail).
        try {
          await PlaywrightAssertions.expectElementToBeVisible(tokenElement, {
            timeout: 5000,
            description: `Token ${symbol} visible without scroll`,
          });
        } catch {
          // Keyboard / FlatList clipping can leave rows displayed:false even
          // after search — force blur again, then wait.
          await PlaywrightGestures.dismissKeyboardAfterTokenSearch();
          if (isAndroid) {
            try {
              const scrollView = await PlaywrightMatchers.getElementById(
                QuoteViewSelectorIDs.TOKEN_LIST,
                { exact: true },
              );
              tokenElement = await resolveToken();
              await PlaywrightGestures.scrollIntoView(tokenElement, {
                scrollableElement: scrollView,
                scrollParams: { direction: 'up' },
              });
            } catch {
              // Token may already be visible after search filters the list.
            }
          }
          tokenElement = await resolveToken();
          await PlaywrightAssertions.expectElementToBeVisible(tokenElement, {
            timeout: TIMEOUT.TOKEN_SELECT,
            description: `Token ${symbol} should be visible`,
          });
        }
        await PlaywrightGestures.waitAndTap(tokenElement, {
          checkForDisplayed: true,
          checkForEnabled: true,
          delay: 1000,
        });
      },
    });
  }

  async typeSearchToken(symbol: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(asDetoxElement(this.searchToken), symbol, {
          elemDescription: `Search Token with symbol ${symbol}`,
        });
      },
      appium: async () => {
        const searchField = await asPlaywrightElement(this.searchToken);
        await searchField.fill(symbol);
        // Wait for BridgeTokenSelector debouncedSearch (300ms) + result settle.
        await sleep(TIMEOUT.TOKEN_SEARCH_SETTLE);
        // iOS soft keyboard covers the list (rows stay displayed:false).
        // tapOutside alone is flaky — also tap the pills strip to force blur.
        await PlaywrightGestures.dismissKeyboardAfterTokenSearch();
      },
    });
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
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.amountInput, {
          elemDescription: 'Tap source amount input to open keypad',
        });
      },
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.amountInput),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
            delay: 1500,
          },
        );
      },
    });
  }

  async dismissKeypad(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.rateLabel, {
          elemDescription: 'Tap rate label to dismiss keypad',
        });
      },
      appium: async () => {
        // Prefer the "Rate" label (not rate-arrow-button) when a quote is present —
        // tapping BRIDGE_VIEW_SCROLL can open QuoteSelectorView (swap providers).
        // When there is no quote (e.g. RWA geo-block), Rate is absent; fall back
        // to the scroll view so the keypad can still be dismissed.
        try {
          await PlaywrightGestures.waitAndTap(
            await asPlaywrightElement(this.rateLabel),
            {
              checkForDisplayed: true,
              checkForEnabled: true,
              timeout: 5000,
            },
          );
        } catch {
          const scrollView = await PlaywrightMatchers.getElementById(
            QuoteViewSelectorIDs.BRIDGE_VIEW_SCROLL,
            { exact: true },
          );
          await PlaywrightGestures.waitAndTap(scrollView, {
            checkForDisplayed: true,
            checkForEnabled: true,
          });
        }
      },
    });
  }

  async tapDestinationToken(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await UnifiedGestures.waitAndTap(this.destinationTokenArea, {
          description: 'Tap destination asset picker',
        });
      },
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.destinationTokenArea),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
            delay: 1000,
          },
        );
        // Confirm token selector opened — TextInput can lag behind navigation.
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(this.searchToken),
          {
            timeout: TIMEOUT.SWAP_SCREEN_VISIBLE,
            description:
              'Token search input visible after opening destination token picker',
          },
        );
      },
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
    await encapsulatedAction({
      detox: async () => {
        const networkElement = Matchers.getElementByText(network);
        await Gestures.waitAndTap(networkElement, {
          delay: 1000,
          elemDescription: `Select network ${network}`,
        });
      },
      appium: async () => {
        const networkElement =
          await PlaywrightMatchers.getElementByCatchAll(network);
        await PlaywrightAssertions.expectElementToBeVisible(networkElement, {
          timeout: TIMEOUT.NETWORK_SELECT,
          description: `Network ${network} should be visible`,
        });
        await PlaywrightGestures.waitAndTap(networkElement, {
          checkForDisplayed: true,
          checkForEnabled: true,
          delay: 1000,
        });
      },
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
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(
          asDetoxElement(this.amountInput),
          {
            timeout: TIMEOUT.SWAP_SCREEN_VISIBLE,
            description: 'Swap screen source token input should be visible',
          },
        );
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(this.amountInput),
          {
            timeout: TIMEOUT.SWAP_SCREEN_VISIBLE,
            description: 'Swap screen source token input should be visible',
          },
        );
      },
    });
  }

  /**
   * Asserts the quote is displayed by verifying the destination token input
   * contains a numeric value (meaning a quote result has populated the field).
   */
  async isQuoteDisplayed(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(
          asDetoxElement(this.feeDisclaimerLabel),
          {
            description: 'Fee disclaimer label is visible (quote displayed)',
            timeout: TIMEOUT.QUOTE_DISPLAYED,
          },
        );
      },
      appium: async () => {
        const el = await asPlaywrightElement(this.destinationTokenInput);
        const timeout = TIMEOUT.QUOTE_DISPLAYED;
        const interval = 300;
        const start = Date.now();
        while (Date.now() - start < timeout) {
          const text = await el.textContent();
          if (text && /\d/.test(text) && parseFloat(text) > 0) {
            return;
          }
          await new Promise((r) => setTimeout(r, interval));
        }
        const finalText = await el.textContent();
        throw new Error(
          `Destination token input does not contain a numeric value after ${timeout}ms, got: "${finalText}"`,
        );
      },
    });
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
    await encapsulatedAction({
      detox: async () => {
        await this.tapSourceAmountInput();
        await this.enterAmount(amount);
      },
      appium: async () => {
        await this.tapSourceAmountInput();
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.keypadDeleteButton),
          {
            checkForDisplayed: true,
            checkForEnabled: true,
            delay: 1000,
          },
        );
        await this.enterAmount(amount);
      },
    });
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
    const banner = PlaywrightMatchers.getElementById(
      QuoteViewSelectorIDs.NO_QUOTES_BANNER,
      { exact: true },
    );

    await PlaywrightAssertions.expectElementToBeVisible(banner, {
      timeout,
      description:
        'RWA geo-restricted banner should be visible on the swap screen',
    });

    await PlaywrightAssertions.expectTextDisplayed(message, {
      within: banner,
      timeout,
      description: `RWA geo-restricted message "${message}" should be visible on the swap screen`,
    });
  }
}

export default new QuoteView();
