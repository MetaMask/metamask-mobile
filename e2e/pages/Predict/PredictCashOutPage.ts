import Matchers from '../../framework/Matchers';
import Gestures from '../../utils/Gestures';
import { PredictCashOutSelectorsIDs } from '../../selectors/Predict/Predict.selectors';

class PredictCashOutPage {
  get container(): DetoxElement {
    return Matchers.getElementByID(PredictCashOutSelectorsIDs.CONTAINER);
  }
  get cashOutButton(): DetoxElement {
    return Matchers.getElementByID(PredictCashOutSelectorsIDs.CASH_OUT_BUTTON);
  }
  async tapCashOutButton(): Promise<void> {
    await Gestures.waitAndTap(this.cashOutButton);
  }
}

export default new PredictCashOutPage();
