import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../selectors/Bridge/QuoteView.selectors';

class QuoteView {
  get confirmBridge(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.CONFIRM_BRIDGE);
  }

  get confirmSwap(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.CONFIRM_SWAP);
  }

  get bridgeTo(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.BRIDGE_TO);
  }

  get swapTo(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.SWAP_TO);
  }

  get searchToken(): Promise<Detox.IndexableNativeElement> {
    return Matchers.getElementByID(QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT) as Promise<Detox.IndexableNativeElement>;
  }

  get networkFeeLabel(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.NETWORK_FEE);
  }

  sourceToken(symbol: string): DetoxElement {
    return Matchers.getElementByText(symbol);
  }

  destToken(symbol: string): DetoxElement {
    return Matchers.getElementByID(`asset-${symbol}`);
  }

  async enterAmount(amount: string): Promise<void> {
    for (const digit of amount) {
      const button = await Matchers.getElementByText(digit);
      await Gestures.waitAndTap(button, { delayBeforeTap: 500});
    }
  }

  async tapSearchToken(): Promise<void> {
    await Gestures.waitAndTap(this.searchToken);
  }

  async tapBridgeTo(): Promise<void> {
    await Gestures.waitAndTap(this.bridgeTo);
  }

  async tapToken(symbol: string): Promise<void> {
    await Gestures.waitAndTap(this.sourceToken(symbol), { delayBeforeTap: 1000 });
  }

  async tapSwapTo(): Promise<void> {
    await Gestures.waitAndTap(this.swapTo);
  }

  async selectNetwork(network: string): Promise<void> {
    const networkElement = Matchers.getElementByText(network);
    await Gestures.waitAndTap(networkElement, { delayBeforeTap: 1000 });
  }

  async typeSearchToken(symbol: string): Promise<void> {
    await Gestures.typeTextAndHideKeyboard(this.searchToken, symbol);
  }

  async selectSourceToken(symbol: string): Promise<void> {
    const token = this.sourceToken(symbol);
    await Gestures.waitAndTap(token);
  }

  async selectDestToken(symbol: string): Promise<void> {
    const token = this.destToken(symbol);
    await Gestures.waitAndTap(token, { delayBeforeTap: 1000});
  }

  async tapConfirmBridge(): Promise<void> {
    await Gestures.waitAndTap(this.confirmBridge);
  }

  async tapConfirmSwap(): Promise<void> {
    await Gestures.waitAndTap(this.confirmSwap);
  }
}

export default new QuoteView();
