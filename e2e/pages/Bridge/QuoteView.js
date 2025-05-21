import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../selectors/Bridge/QuoteView.selectors';

class QuoteView {
  get continueButton() {
    return Matchers.getElementByText(QuoteViewSelectorText.CONTINUE);
  }

  get bridgeTo() {
    return Matchers.getElementByText(QuoteViewSelectorText.BRIDGE_TO);
  }

  get searchToken() {
    return Matchers.getElementByID(QuoteViewSelectorIDs.TOKEN_SEARCH_INPUT);
  }

  get quotesLabel() {
    return Matchers.getElementByID(QuoteViewSelectorText.QUOTES);
  }

  async enterBridgeAmount(amount) {
    for (let idx = 0; idx < amount.length; idx++) {
      const element = Matchers.getElementByText(amount[idx]);
      await Gestures.waitAndTap(element);
    }
  }

  async tapSearchToken() {
    await Gestures.waitAndTap(this.searchToken);
  }

  async tapBridgeTo() {
    await Gestures.waitAndTap(this.bridgeTo);
  }

  async selectNetwork(network) {
    const element = Matchers.getElementByText(network);
    await Gestures.waitAndTap(element);
  }

  async typeSearchToken(symbol) {
    await Gestures.typeTextAndHideKeyboard(this.searchToken, symbol);
  }

  async selectToken(symbol, index = 0) {
    const element = Matchers.getElementByID(`asset-${symbol}`, index);
    await Gestures.waitAndTap(element);
  }

  async tapContinue() {
    await Gestures.waitAndTap(this.continueButton);
  }
}

export default new QuoteView();
