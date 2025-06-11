import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../selectors/Bridge/QuoteView.selectors';

class QuoteView {
  get confirmButton(): WebdriverIO.Element {
    return Matchers.getElementByText(QuoteViewSelectorText.CONFIRM_BRIDGE);
  }

  get bridgeTo(): WebdriverIO.Element {
    return Matchers.getElementByText(QuoteViewSelectorText.BRIDGE_TO);
  }

  get searchToken(): WebdriverIO.Element {
    return Matchers.getElementByID(QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT);
  }

  get networkFeeLabel(): WebdriverIO.Element {
    return Matchers.getElementByText(QuoteViewSelectorText.NETWORK_FEE);
  }

  token(symbol: string): WebdriverIO.Element {
    return Matchers.getElementByID(`asset-${symbol}`);
  }

  async enterBridgeAmount(amount: string): Promise<void> {
    for (let idx = 0; idx < amount.length; idx++) {
      const element = Matchers.getElementByText(amount[idx]);
      await Gestures.waitAndTap(element);
    }
  }

  async tapSearchToken(): Promise<void> {
    await Gestures.waitAndTap(this.searchToken);
  }

  async tapBridgeTo(): Promise<void> {
    await Gestures.waitAndTap(this.bridgeTo);
  }

  async selectNetwork(network: string): Promise<void> {
    const element = Matchers.getElementByText(network);
    await Gestures.waitAndTap(element);
  }

  async typeSearchToken(symbol: string): Promise<void> {
    await Gestures.typeTextAndHideKeyboard(this.searchToken, symbol);
  }

  async selectToken(symbol: string): Promise<void> {
    const element = await this.token(symbol);
    await Gestures.waitAndTap(element);
  }

  async tapConfirm(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton);
  }
}

export default new QuoteView();
