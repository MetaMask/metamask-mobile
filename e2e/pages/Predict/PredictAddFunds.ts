import { Matchers, Gestures } from '../../framework';
import { PredictAddFundsSelectorText } from '../../selectors/Predict/Predict.selectors';

class PredictAddFunds {
  get addFundsButton(): DetoxElement {
    return Matchers.getElementByText(PredictAddFundsSelectorText.ADD_FUNDS);
  }

  async tapAddFunds(): Promise<void> {
    await Gestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Predict Add Funds button',
    });
  }
}

export default new PredictAddFunds();
