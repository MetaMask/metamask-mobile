import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../selectors/swaps/QuoteView.selectors';

class QuoteView {
  get selectAmountLabel(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.SELECT_AMOUNT);
  }

  get confirmBridge(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.CONFIRM_BRIDGE);
  }

  get confirmSwap(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.CONFIRM_SWAP);
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

  get cancelButton(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.CANCEL);
  }

  get networkFeeLabel(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.NETWORK_FEE);
  }

  token(chainId: string, symbol: string): Detox.NativeElement {
    const elementId = `asset-${chainId}-${symbol}`;
    return element(by.id(elementId)).atIndex(0);
  }

  async enterAmount(amount: string): Promise<void> {
    for (const digit of amount) {
      const button = Matchers.getElementByText(digit);
      await Gestures.waitAndTap(button);
    }
  }

  async tapSearchToken(): Promise<void> {
    await Gestures.waitAndTap(this.searchToken);
  }

  async tapToken(chainId: string, symbol: string): Promise<void> {
    await Gestures.waitAndTap(
      this.token(chainId, symbol) as unknown as DetoxElement,
      {
        delay: 1000,
      },
    );
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
    const token = Matchers.getElementByText('ETH');
    await Gestures.waitAndTap(token);
  }

  async tapDestToken(): Promise<void> {
    const token = Matchers.getElementByText('USDC');
    await Gestures.waitAndTap(token);
  }

  async tapDestinationToken(): Promise<void> {
    await Gestures.waitAndTap(this.destinationTokenArea);
  }

  async tapSeeAll(): Promise<void> {
    await Gestures.waitAndTap(this.seeAllButton);
  }

  async swipeNetwork(network: string, percentage: number): Promise<void> {
    const networkElement = Matchers.getElementByText(network);
    await Gestures.swipe(networkElement, 'left', { speed: 'slow', percentage });
  }

  async selectNetwork(network: string): Promise<void> {
    const networkElement = Matchers.getElementByText(network);
    await Gestures.waitAndTap(networkElement, { delay: 1000 });
  }

  async tapConfirmBridge(): Promise<void> {
    await Gestures.waitAndTap(this.confirmBridge);
  }

  async tapConfirmSwap(): Promise<void> {
    await Gestures.waitAndTap(this.confirmSwap, {
      delay: 1300,
    });
  }

  async tapOnCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new QuoteView();
