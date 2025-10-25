import { Matchers, Gestures } from '../../framework';
import { PredictWithdrawSelectorsIDs } from '../../selectors/Predict/Predict.selectors';

class PredictWithdrawPage {
  get container(): DetoxElement {
    return Matchers.getElementByID(PredictWithdrawSelectorsIDs.CONTAINER);
  }
  get continueButton(): DetoxElement {
    return Matchers.getElementByID(PredictWithdrawSelectorsIDs.CONTINUE_BUTTON);
  }

  async enterAmount(amount: string): Promise<void> {
    const amountInput = Matchers.getElementByText(amount);
    await Gestures.waitAndTap(amountInput, {
      elemDescription: 'Entering amount in withdraw page',
    });
  }
  async tapContinue(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Tapping continue button in withdraw page',
    });
  }
}

export default new PredictWithdrawPage();
