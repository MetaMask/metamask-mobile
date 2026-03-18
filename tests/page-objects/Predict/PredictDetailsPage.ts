import {
  Assertions,
  Gestures,
  Matchers,
  PlaywrightMatchers,
  UnifiedGestures,
  encapsulated,
  encapsulatedAction,
  type EncapsulatedElementType,
} from '../../framework';
import {
  PredictBalanceSelectorsIDs,
  PredictBuyPreviewSelectorsIDs,
  PredictMarketDetailsSelectorsIDs,
  PredictMarketDetailsSelectorsText,
} from '../../../app/components/UI/Predict/Predict.testIds';
class PredictDetailsPage {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictMarketDetailsSelectorsIDs.SCREEN),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictMarketDetailsSelectorsIDs.SCREEN,
          { exact: true },
        ),
    });
  }

  get positionsTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          PredictMarketDetailsSelectorsText.POSITIONS_TAB_TEXT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PredictMarketDetailsSelectorsText.POSITIONS_TAB_TEXT,
        ),
    });
  }

  get aboutTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          PredictMarketDetailsSelectorsText.ABOUT_TAB_TEXT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PredictMarketDetailsSelectorsText.ABOUT_TAB_TEXT,
        ),
    });
  }

  get outcomesTab(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          PredictMarketDetailsSelectorsText.OUTCOMES_TAB_TEXT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          PredictMarketDetailsSelectorsText.OUTCOMES_TAB_TEXT,
        ),
    });
  }

  get aboutTabContent(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PredictMarketDetailsSelectorsIDs.ABOUT_TAB_CONTENT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictMarketDetailsSelectorsIDs.ABOUT_TAB_CONTENT,
          { exact: true },
        ),
    });
  }

  get outcomesTabContent(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB_CONTENT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB_CONTENT,
          { exact: true },
        ),
    });
  }

  get cashOutButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON,
          { exact: true },
        ),
    });
  }

  get claimButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON,
          { exact: true },
        ),
    });
  }

  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByLabel('Back') as unknown as DetoxElement,
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictMarketDetailsSelectorsIDs.BACK_BUTTON,
          { exact: true },
        ),
    });
  }

  get balanceCard(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictBalanceSelectorsIDs.BALANCE_CARD,
          {
            exact: true,
          },
        ),
    });
  }

  get placeBetButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON,
          { exact: true },
        ),
    });
  }

  get volumeLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Volume'),
      appium: () => PlaywrightMatchers.getElementByText('Volume'),
    });
  }

  async waitForScreenToDisplay(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Predict market details screen',
      timeout: 15000,
    });
  }

  async isVisible(): Promise<void> {
    await this.waitForScreenToDisplay();
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
      description: 'Back button',
    });
  }

  async tapPositionsTab(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.positionsTab, {
      description: 'Positions tab',
    });
  }
  async tapAboutTab(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.aboutTab, {
      description: 'About tab',
    });
  }
  async tapOutcomesTab(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.outcomesTab, {
      description: 'Outcomes tab',
    });
  }
  async tapCashOutButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cashOutButton, {
      description: 'Cash out button',
    });
  }

  async tapOpenPositionValue(): Promise<void> {
    // Use regex to match both "Celtics\n83¢" and "Celtics • 83¢" formats
    const celticsButton = (await Matchers.getElementByText(
      /Celtics[\s•\n]*83¢/,
    )) as unknown as DetoxElement;

    await UnifiedGestures.waitAndTap(celticsButton, {
      description: 'Celtics outcome button',
    });
  }

  async tapPositionAmount(amount: string): Promise<void> {
    const digits = amount.split('');

    for (const digit of digits) {
      const digitElement = (await Matchers.getElementByText(
        digit,
      )) as unknown as DetoxElement;
      await UnifiedGestures.waitAndTap(digitElement, {
        description: `Tap ${digit} on keypad`,
      });
    }
  }

  async tapDoneButton(): Promise<void> {
    const continueButton = (await Matchers.getElementByText(
      'Done',
    )) as unknown as DetoxElement;

    await UnifiedGestures.waitAndTap(continueButton, {
      description: 'Done button',
    });
  }

  async tapContinueButton(): Promise<void> {
    const continueButton = (await Matchers.getElementByText(
      'Continue',
    )) as unknown as DetoxElement;

    await UnifiedGestures.waitAndTap(continueButton, {
      description: 'Continue button',
    });
  }

  async tapOpenPosition(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.placeBetButton as DetoxElement, {
          elemDescription: 'Place bet button',
          delay: 1000,
        });
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.placeBetButton, {
          description: 'Place bet button',
        });
      },
    });
  }

  async tapClaimWinningsButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.claimButton as DetoxElement, {
          elemDescription: 'Tap claim winnings button on market details page',
          delay: 3000,
        });
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.claimButton, {
          description: 'Tap claim winnings button on market details page',
        });
      },
    });
  }

  async isAboutTabContentDisplayed(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.aboutTabContent, {
      description: 'About tab content',
      timeout: 15000,
    });
  }

  async isOutcomesTabContentDisplayed(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.outcomesTabContent, {
      description: 'Outcomes tab content',
      timeout: 15000,
    });
  }

  async verifyVolumeTextDisplayed(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.volumeLabel, {
      description: 'Volume label',
      timeout: 15000,
    });
  }

  async hasOutcomesTab(): Promise<boolean> {
    try {
      await Assertions.expectElementToBeVisible(this.outcomesTab, {
        description: 'Outcomes tab',
        timeout: 2000,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export default new PredictDetailsPage();
