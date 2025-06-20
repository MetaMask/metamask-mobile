import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../selectors/Bridge/QuoteView.selectors';

class QuoteView {
  get confirmButton(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.CONFIRM_BRIDGE);
  }

  get bridgeTo(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.BRIDGE_TO);
  }

  get searchToken(): Promise<Detox.IndexableNativeElement> {
    return Matchers.getElementByID(QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT) as Promise<Detox.IndexableNativeElement>;
  }

  get networkFeeLabel(): DetoxElement {
    return Matchers.getElementByText(QuoteViewSelectorText.NETWORK_FEE);
  }

  token(symbol: string): DetoxElement {
    return Matchers.getElementByID(`asset-${symbol}`);
  }

  async enterBridgeAmount(amount: string): Promise<void> {
  for (const digit of amount) {
    const button = Matchers.getElementByText(digit);
    await Gestures.waitAndTap(button);
  }
}

  async tapSearchToken(): Promise<void> {
    await Gestures.waitAndTap(this.searchToken);
  }

  async tapBridgeTo(): Promise<void> {
    await Gestures.waitAndTap(this.bridgeTo);
  }

  async selectNetwork(network: string): Promise<void> {
    const networkElement = Matchers.getElementByText(network);
    await Gestures.waitAndTap(networkElement);
  }

  async typeSearchToken(symbol: string): Promise<void> {
    await Gestures.typeTextAndHideKeyboard(this.searchToken, symbol);
  }

  async selectToken(symbol: string): Promise<void> {
    const token = this.token(symbol);
    await Gestures.waitAndTap(token);
  }

  async tapConfirm(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton);
  }
}

export default new QuoteView();
