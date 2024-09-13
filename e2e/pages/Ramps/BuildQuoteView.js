import Matchers from '../../utils/Matchers';
import { BuildQuoteSelectors } from '../../selectors/Ramps/BuildQuote.selectors';
import Assertions from '../../utils/Assertions';

class BuildQuoteView {
  get amountToBuyLabel() {
    return Matchers.getElementByText(BuildQuoteSelectors.AMOUNT_TO_BUY_LABEL);
  }
  get getQuotesButton() {
    return Matchers.getElementByText(BuildQuoteSelectors.GET_QUOTES_BUTTON);
  }

  async verifyBuildQuoteViewVisible() {
    await Assertions.checkIfVisible(this.amountToBuyLabel);
    await Assertions.checkIfVisible(this.getQuotesButton);
  }
}

export default new BuildQuoteView();
