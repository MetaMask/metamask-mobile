import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { BuildQuoteSelectors } from '../../selectors/Ramps/BuildQuote.selectors';

class BuildQuoteView {
  get doneButton() {
    return Matchers.getElementByText(BuildQuoteSelectors.DONE_BUTTON);
  }

  get amountTextField() {
    return Matchers.getElementByText('$0');
  }

  async tapAmountTextField() {
    await Gestures.waitAndTap(this.amountTextField);
  }

  async tapFiatAmount(amount) {
    const acceptedValues = ['$50', '$100', '$200', '$400'];
    
    if (!acceptedValues.includes(amount)) {
      throw new Error(`Invalid amount: ${amount}. Accepted values are: ${acceptedValues.join(', ')}`);
    }

    const amountElement = element(by.text(amount));
    await amountElement.tap();
  }

  async tapDoneButton() {
    await Gestures.waitAndTap(this.doneButton);
  }

}

export default new BuildQuoteView();
