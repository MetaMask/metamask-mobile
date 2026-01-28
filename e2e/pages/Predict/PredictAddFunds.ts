import { Matchers, Gestures } from '../../../tests/framework';
import { PredictAddFundsSelectorText } from '../../../app/components/UI/Predict/Predict.testIds';

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
