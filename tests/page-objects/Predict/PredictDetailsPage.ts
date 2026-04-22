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
        PlaywrightMatchers.getElementById(
          PredictMarketDetailsSelectorsIDs.POSITIONS_TAB,
          { exact: true },
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
        PlaywrightMatchers.getElementById(
          PredictMarketDetailsSelectorsIDs.ABOUT_TAB,
          { exact: true },
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
        PlaywrightMatchers.getElementById(
          PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB,
          { exact: true },
        ),
    });
  }
  //TODO: Add the correct TESTID on the component for the about tab content
  // This was migrated from the old screen-objects/PredictDetailsScreen.js file
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

  //TODO: Add the correct TESTID on the component for the outcomes tab content
  // This was migrated from the old screen-objects/PredictDetailsScreen.js file
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

  private getOpenPositionValueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          /Celtics[\s•\n]*83¢/,
        ) as unknown as DetoxElement,
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          `//*[ (contains(@text,'Celtics') and contains(@text,'83¢')) or (contains(@label,'Celtics') and contains(@label,'83¢')) or (contains(@name,'Celtics') and contains(@name,'83¢')) ]`,
        ),
    });
  }

  private getKeypadDigitButton(digit: string): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(digit),
      appium: () => PlaywrightMatchers.getElementByText(digit),
    });
  }

  private getDoneButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Done'),
      appium: () => PlaywrightMatchers.getElementByText('Done'),
    });
  }

  private getContinueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Continue'),
      appium: () => PlaywrightMatchers.getElementByText('Continue'),
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
      checkForDisplayed: false,
    });
  }
  async tapOutcomesTab(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.outcomesTab, {
      description: 'Outcomes tab',
      checkForDisplayed: false,
    });
  }
  async tapCashOutButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cashOutButton, {
      description: 'Cash out button',
    });
  }

  async tapOpenPositionValue(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getOpenPositionValueButton(), {
      description: 'Celtics outcome button',
    });
  }

  async tapPositionAmount(amount: string): Promise<void> {
    const digits = amount.split('');

    for (const digit of digits) {
      await UnifiedGestures.waitAndTap(this.getKeypadDigitButton(digit), {
        description: `Tap ${digit} on keypad`,
      });
    }
  }

  async tapDoneButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getDoneButton(), {
      description: 'Done button',
    });
  }

  async tapContinueButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getContinueButton(), {
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
