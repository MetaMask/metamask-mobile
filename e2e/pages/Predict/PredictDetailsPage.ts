import { Matchers, Gestures } from '../../framework';
import {
  PredictBalanceSelectorsIDs,
  PredictBuyPreviewSelectorsIDs,
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

  get placeBetButton(): DetoxElement {
    return Matchers.getElementByID(
      PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON,
    );
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

  async tapOpenPositionValue(): Promise<void> {
    // Use regex to match both "Celtics\n83¢" and "Celtics • 83¢" formats
    const celticsButton = (await Matchers.getElementByText(
      /Celtics[\s•\n]*83¢/,
    )) as unknown as DetoxElement;

    await Gestures.waitAndTap(celticsButton, {
      elemDescription: 'Celtics outcome button',
    });
  }

  async tapPositionAmount(amount: string): Promise<void> {
    const digits = amount.split('');

    for (const digit of digits) {
      const digitElement = (await Matchers.getElementByText(
        digit,
      )) as unknown as DetoxElement;
      await Gestures.waitAndTap(digitElement, {
        elemDescription: `tap ${digit} on keypad`,
      });
    }
  }

  async tapDoneButton(): Promise<void> {
    const continueButton = (await Matchers.getElementByText(
      'Done',
    )) as unknown as DetoxElement;

    await Gestures.waitAndTap(continueButton, {
      elemDescription: 'Done button',
    });
  }

  async tapContinueButton(): Promise<void> {
    const continueButton = (await Matchers.getElementByText(
      'Continue',
    )) as unknown as DetoxElement;

    await Gestures.waitAndTap(continueButton, {
      elemDescription: 'Continue button',
    });
  }

  async tapOpenPosition(): Promise<void> {
    await Gestures.waitAndTap(this.placeBetButton, {
      elemDescription: 'Place bet button',
    });
  }
}

export default new PredictDetailsPage();
