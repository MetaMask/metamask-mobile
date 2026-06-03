import { Matchers } from '../../framework';
import { PredictAddFundsSelectorText } from '../../../app/components/UI/Predict/Predict.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class PredictAddFunds {
  get addFundsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(PredictAddFundsSelectorText.ADD_FUNDS),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PredictAddFundsSelectorText.ADD_FUNDS,
        ),
    });
  }

  async tapAddFunds(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Predict Add Funds button',
    });
  }
}

export default new PredictAddFunds();
