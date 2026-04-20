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
} from '../../framework';
import { getAssetTestId } from '../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
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
} as const;

class QuoteView {
  get selectAmountLabel(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.SELECT_AMOUNT);
  }

  get confirmBridge(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.CONFIRM_BUTTON);
  }

  get confirmSwap(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.CONFIRM_BUTTON);
  }

  get sourceTokenArea(): DetoxElement {
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
      appium: () =>
        PlaywrightMatchers.getElementById(
          QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT,
          { exact: true },
        ),
    });
  }

  get seeAllButton(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.SELECT_ALL);
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.BACK_BUTTON);
  }

  get networkFeeLabel(): DetoxElement {
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

  get keypadDeleteButton(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.KEYPAD_DELETE_BUTTON);
  }

  get maxLink(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.MAX);
  }

  get includedLabel(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.INCLUDED);
  }

  get rateLabel(): DetoxElement {
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
    for (const digit of amount) {
      const button = Matchers.getElementByText(digit);
      await Gestures.waitAndTap(button, {
        elemDescription: `Tapping on keyboard digit ${digit}`,
      });
    }
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
        let tokenElement: PlaywrightElement;
        if (await PlatformDetector.isAndroid()) {
          tokenElement = await PlaywrightMatchers.getElementById(
            this.getTokenElementId(chainId, symbol),
            { exact: false },
          );
        } else {
          tokenElement = await PlaywrightMatchers.getElementByNameiOS(
            this.getTokenElementId(chainId, symbol),
          );
        }
        await PlaywrightAssertions.expectElementToBeVisible(tokenElement, {
          timeout: TIMEOUT.TOKEN_SELECT,
          description: `Token ${symbol} should be visible`,
        });
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
    await Gestures.waitAndTap(this.rateLabel, {
      elemDescription: 'Tap rate label to dismiss keypad',
    });
  }

  async tapDestinationToken(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.destinationTokenArea, {
      description: 'Tap destination asset picker',
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
        let digitEl: PlaywrightElement;
        for (const digit of amount) {
          if (await PlatformDetector.isAndroid()) {
            digitEl = await PlaywrightMatchers.getElementByText(digit);
          } else {
            digitEl = await PlaywrightMatchers.getElementByXPath(
              `//*[contains(@name,'keypad-key-${digit}')]`,
            );
          }
          await PlaywrightAssertions.expectElementToBeVisible(digitEl, {
            timeout: TIMEOUT.KEYPAD_DIGIT,
            description: `Keypad digit ${digit} should be visible`,
          });
          await PlaywrightGestures.waitAndTap(digitEl, {
            checkForDisplayed: true,
            checkForEnabled: true,
            delay: 1000,
          });
        }
      },
    });
  }

  /**
   * Gets the slippage display text element (e.g., "2.5%")
   * @param value - The slippage value to match (e.g., "2.5" for 2.5%)
   */
  slippageDisplayText(value: string): DetoxElement {
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
}

export default new QuoteView();
