import Matchers from '../../framework/Matchers';
import Gestures from '../../utils/Gestures';
import {
  PredictMarketDetailsSelectorsIDs,
  PredictMarketDetailsSelectorsText,
} from '../../selectors/Predict/Predict.selectors';
class PredictDetailsPage {
  get container(): DetoxElement {
    return Matchers.getElementByID(PredictMarketDetailsSelectorsIDs.SCREEN);
  }
  get positionsTab(): DetoxElement {
    return Matchers.getElementByText(
      PredictMarketDetailsSelectorsText.POSITIONS_TAB_TEXT,
    );
  }
  get aboutTab(): DetoxElement {
    return Matchers.getElementByText(
      PredictMarketDetailsSelectorsText.ABOUT_TAB_TEXT,
    );
  }
  get outcomesTab(): DetoxElement {
    return Matchers.getElementByText(
      PredictMarketDetailsSelectorsText.OUTCOMES_TAB_TEXT,
    );
  }
  get cashOutButton(): DetoxElement {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON,
    );
  }

  async tapPositionsTab(): Promise<void> {
    await Gestures.waitAndTap(this.positionsTab);
  }
  async tapAboutTab(): Promise<void> {
    await Gestures.waitAndTap(this.aboutTab);
  }
  async tapOutcomesTab(): Promise<void> {
    await Gestures.waitAndTap(this.outcomesTab);
  }
  async tapCashOutButton(): Promise<void> {
    await Gestures.waitAndTap(this.cashOutButton);
  }
}

export default new PredictDetailsPage();
