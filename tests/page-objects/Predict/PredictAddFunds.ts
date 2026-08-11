import { Matchers, Gestures, EncapsulatedElementType } from '../../framework';
import { PredictAddFundsSelectorText } from '../../../app/components/UI/Predict/Predict.testIds';

class PredictAddFunds {
  get addFundsButton(): EncapsulatedElementType {
    return Matchers.getElementByText(PredictAddFundsSelectorText.ADD_FUNDS);
  }

  async tapAddFunds(): Promise<void> {
    await Gestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Predict Add Funds button',
    });
  }
}

export default new PredictAddFunds();
