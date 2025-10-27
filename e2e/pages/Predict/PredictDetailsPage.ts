import Matchers from '../../framework/Matchers';
import { PredictMarketDetailsSelectorsIDs } from '../../selectors/Predict/Predict.selectors';

class PredictDetailsPage {
  get container(): DetoxElement {
    return Matchers.getElementByID(PredictMarketDetailsSelectorsIDs.SCREEN);
  }
}

export default new PredictDetailsPage();
