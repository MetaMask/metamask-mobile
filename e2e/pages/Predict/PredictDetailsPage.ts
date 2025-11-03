import { Matchers, Gestures } from '../../framework';
import enContent from '../../../locales/languages/en.json';
import {
  PredictBalanceSelectorsIDs,
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
  get backButton(): DetoxElement {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.BACK_BUTTON,
    );
  }
  get balanceCard(): DetoxElement {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD);
  }

  get withdrawButton(): DetoxElement {
    return Matchers.getElementByText(enContent.predict.deposit.withdraw);
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button',
    });
  }

  async tapPositionsTab(): Promise<void> {
    await Gestures.waitAndTap(this.positionsTab, {
      elemDescription: 'Positions tab',
    });
  }
  async tapAboutTab(): Promise<void> {
    await Gestures.waitAndTap(this.aboutTab, {
      elemDescription: 'About tab',
    });
  }
  async tapOutcomesTab(): Promise<void> {
    await Gestures.waitAndTap(this.outcomesTab, {
      elemDescription: 'Outcomes tab',
    });
  }
  async tapCashOutButton(): Promise<void> {
    await Gestures.waitAndTap(this.cashOutButton, {
      elemDescription: 'Cash out button',
    });
  }

  async tapWithdrawButton(): Promise<void> {
    await Gestures.waitAndTap(this.withdrawButton, {
      elemDescription: 'Withdraw button',
    });
  }
}

export default new PredictDetailsPage();
