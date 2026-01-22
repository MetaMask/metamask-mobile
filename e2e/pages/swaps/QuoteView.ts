import { waitFor } from 'detox';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../../app/components/UI/Swaps/QuoteView.testIds';

const TOKEN_LIST_MATCHER = by.id(QuoteViewSelectorIDs.TOKEN_LIST);

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

  get amountInput(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.SOURCE_TOKEN_INPUT);
  }

  get destinationTokenArea(): DetoxElement {
    return Matchers.getElementByID(QuoteViewSelectorIDs.DESTINATION_TOKEN_AREA);
  }

  get searchToken(): Promise<Detox.IndexableNativeElement> {
    return Matchers.getElementByID(
      QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT,
    ) as Promise<Detox.IndexableNativeElement>;
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

  get maxLink(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.MAX);
  }

  get includedLabel(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.INCLUDED);
  }

  token(chainId: string, symbol: string): Detox.NativeElement {
    const elementId = `asset-${chainId}-${symbol}`;
    return element(by.id(elementId)).atIndex(0);
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
    await Gestures.waitAndTap(this.searchToken, {
      elemDescription: 'Tap on token search input element',
    });
  }

  async tapToken(chainId: string, symbol: string): Promise<void> {
    const tokenElement = this.token(chainId, symbol);
    // Wait for the token element to exist first (network change may still be in progress)
    await waitFor(tokenElement).toExist().withTimeout(15000);
    // Scroll to the token element since it may be below the visible viewport
    await Gestures.scrollToElement(
      tokenElement as unknown as DetoxElement,
      Promise.resolve(TOKEN_LIST_MATCHER),
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
  }

  async typeSearchToken(symbol: string) {
    await Gestures.typeText(this.searchToken, symbol, {
      elemDescription: `Search Token with symbol ${symbol}`,
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

  async tapDestinationToken(): Promise<void> {
    await Gestures.waitAndTap(this.destinationTokenArea, {
      elemDescription: 'Tap destination asset picker',
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
    const networkElement = Matchers.getElementByText(network);
    await Gestures.waitAndTap(networkElement, {
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

  async tapOnBackButton() {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button on Quote View',
    });
  }

  async tapMax(): Promise<void> {
    await Gestures.waitAndTap(this.maxLink, {
      elemDescription: 'Tap Max link to use maximum balance',
    });
  }
}

export default new QuoteView();
