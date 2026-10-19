import { Matchers, Gestures, type AppiumElement } from '../../framework';
import { PredictCashOutSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';

class PredictCashOutPage {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictCashOutSelectorsIDs.CONTAINER);
  }
  get cashOutButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PredictCashOutSelectorsIDs.SELL_PREVIEW_CASH_OUT_BUTTON,
    );
  }
  async tapCashOutButton(): Promise<void> {
    await Gestures.waitAndTap(this.cashOutButton, {
      elemDescription: 'Cash out button',
    });
  }
}

export default new PredictCashOutPage();
