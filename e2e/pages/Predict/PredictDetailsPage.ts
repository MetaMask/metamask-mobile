import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { PredictMarketDetailsSelectorsIDs } from '../../selectors/Predict/Predict.selectors';

class PredictDetailsPage {
  get container(): DetoxElement {
    return Matchers.getElementByID(PredictMarketDetailsSelectorsIDs.SCREEN);
  }

  get positionsTab(): DetoxElement {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.POSITIONS_TAB,
    );
  }

  get cashOutButton(): DetoxElement {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON,
    );
  }

  async tapPositionsTab(): Promise<void> {
    await Gestures.waitAndTap(this.positionsTab, {
      elemDescription: 'Tap Positions tab in Predict Details',
    });
  }

  async tapCashOutButton(): Promise<void> {
    await Gestures.waitAndTap(this.cashOutButton, {
      elemDescription: 'Tap Cash out button in Predict Details',
    });
  }
}

export default new PredictDetailsPage();
