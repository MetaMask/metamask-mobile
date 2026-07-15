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
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import {
  PredictBalanceSelectorsIDs,
  PredictBuyPreviewSelectorsIDs,
  PredictMarketDetailsSelectorsIDs,
  PredictMarketDetailsSelectorsText,
} from '../../../app/components/UI/Predict/Predict.testIds';
import { PREDICT_PICK_ITEM_TEST_IDS } from '../../../app/components/UI/Predict/components/PredictPicks/PredictPickItem.testIds';
import {
  PREDICT_GAME_DETAILS_FOOTER,
  PREDICT_GAME_DETAILS_FOOTER_TEST_IDS,
} from '../../../app/components/UI/Predict/components/PredictGameDetailsFooter/PredictGameDetailsFooter.testIds';
import { PREDICT_ACTION_BUTTONS_TEST_IDS } from '../../../app/components/UI/Predict/components/PredictActionButtons/PredictActionButtons.testIds';
import { PREDICT_BET_BUTTONS_TEST_IDS } from '../../../app/components/UI/Predict/components/PredictActionButtons/PredictBetButtons.testIds';
import { PREDICT_GAME_DETAILS_CONTENT_TEST_IDS } from '../../../app/components/UI/Predict/components/PredictGameDetailsContent/PredictGameDetailsContent.testIds';

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

  private get backButtonByLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByLabel('Back') as unknown as DetoxElement,
      appium: () => PlaywrightMatchers.getElementByText('Back', true),
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
    const testID = digit === '.' ? 'keypad-key-dot' : `keypad-key-${digit}`;
    return encapsulated({
      detox: () => Matchers.getElementByText(digit),
      appium: () => PlaywrightMatchers.getElementById(testID, { exact: true }),
    });
  }

  private getDoneButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Done'),
      appium: () =>
        PlaywrightMatchers.getElementByText('Done', false, {
          lastElement: true,
        }),
    });
  }

  private getContinueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Continue'),
      appium: () => PlaywrightMatchers.getElementByText('Continue'),
    });
  }

  get gameBetYesButton(): EncapsulatedElementType {
    const testID = `${PREDICT_GAME_DETAILS_FOOTER}${PREDICT_GAME_DETAILS_FOOTER_TEST_IDS.ACTION_BUTTONS}${PREDICT_ACTION_BUTTONS_TEST_IDS.PREDICT_BET_BUTTON}${PREDICT_BET_BUTTONS_TEST_IDS.PREDICT_BET_BUTTON_YES}`;
    return encapsulated({
      detox: () => Matchers.getElementByID(testID),
      appium: () => PlaywrightMatchers.getElementById(testID, { exact: true }),
    });
  }

  async waitForScreenToDisplay(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Predict market details screen',
      timeout: resolveE2EWaitTimeoutMs(30_000),
    });
  }

  async isVisible(): Promise<void> {
    await this.waitForScreenToDisplay();
  }

  async tapBackButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await UnifiedGestures.waitAndTap(this.backButton, {
          description: 'Back button',
          timeout: 30_000,
        });
      },
      appium: async () => {
        const tapBack = async (target: EncapsulatedElementType) => {
          await Assertions.expectElementToBeVisible(target, {
            description: 'Market details back button',
            timeout: 10_000,
          });
          await UnifiedGestures.waitAndTap(target, {
            description: 'Back button',
            timeout: 30_000,
          });
        };

        try {
          await tapBack(this.backButton);
        } catch {
          try {
            await tapBack(this.backButtonByLabel);
          } catch {
            if (!globalThis.driver) {
              throw new Error(
                'WebDriver session not available for back navigation',
              );
            }
            await globalThis.driver.back();
          }
        }
      },
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

  getGameCashOutButton(positionId: string): EncapsulatedElementType {
    const testID = `${PREDICT_PICK_ITEM_TEST_IDS.PREDICT_PICKS_CASH_OUT_BUTTON}-${positionId}`;
    return encapsulated({
      detox: () => Matchers.getElementByID(testID),
      appium: () => PlaywrightMatchers.getElementById(testID, { exact: true }),
    });
  }

  private get gameDetailsScrollView(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.SCROLL_VIEW,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.SCROLL_VIEW,
          { exact: true },
        ),
    });
  }

  private async scrollMarketDetailsDown(percent = 0.45): Promise<void> {
    await UnifiedGestures.swipe(this.gameDetailsScrollView, 'up', {
      percentage: percent,
      description: 'Scroll game market details down',
    });
  }

  private async scrollMarketDetailsToRevealCashOut(
    positionId: string,
    timeout: number,
  ): Promise<void> {
    const cashOutButton = this.getGameCashOutButton(positionId);
    const maxAttempts = Math.max(8, Math.ceil(timeout / 2_000));

    await Assertions.expectElementToBeVisible(this.container, {
      timeout: resolveE2EWaitTimeoutMs(20_000),
      description: 'Predict market details screen before scrolling to cash out',
    });

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await Assertions.expectElementToBeVisible(cashOutButton, {
          timeout: 1_500,
          description: 'Game details cash out button',
        });
        return;
      } catch {
        await this.scrollMarketDetailsDown(0.5);
      }
    }

    await Assertions.expectElementToBeVisible(cashOutButton, {
      timeout: 5_000,
      description: 'Game details cash out button after scrolling',
    });
  }

  async waitForGameCashOutButton(
    positionId: string,
    timeout: number = resolveE2EWaitTimeoutMs(30_000),
  ): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(
          this.getGameCashOutButton(positionId),
          {
            timeout,
            description: 'Game details cash out button',
          },
        );
      },
      appium: async () => {
        await this.scrollMarketDetailsToRevealCashOut(positionId, timeout);
      },
    });
  }

  async tapGameCashOutButton(positionId: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await UnifiedGestures.waitAndTap(
          this.getGameCashOutButton(positionId),
          {
            description: 'Game details cash out button',
          },
        );
      },
      appium: async () => {
        await this.scrollMarketDetailsToRevealCashOut(
          positionId,
          resolveE2EWaitTimeoutMs(30_000),
        );
        await UnifiedGestures.waitAndTap(
          this.getGameCashOutButton(positionId),
          {
            description: 'Game details cash out button',
            timeout: 30_000,
          },
        );
      },
    });
  }

  async tapOpenPositionValue(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getOpenPositionValueButton(), {
      description: 'Celtics outcome button',
    });
  }

  async tapGameBetYesButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.gameBetYesButton, {
      description: 'Game bet yes button',
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
        await Assertions.expectElementToBeVisible(this.placeBetButton, {
          description: 'Place bet button before submitting order',
          timeout: 30_000,
        });
        await UnifiedGestures.waitAndTap(this.placeBetButton, {
          description: 'Place bet button',
          delay: 1000,
          waitForInteractive: true,
        });
        await Assertions.expectElementToBeVisible(this.container, {
          description: 'Market details screen after order submission',
          timeout: 60_000,
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
