import {
  Assertions,
  Gestures,
  Matchers,
  getDriver,
  type EncapsulatedElementType,
} from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import {
  PredictBalanceSelectorsIDs,
  PredictBuyPreviewSelectorsIDs,
  PredictMarketDetailsSelectorsIDs,
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
    return Matchers.getElementByID(PredictMarketDetailsSelectorsIDs.SCREEN);
  }

  get positionsTab(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.POSITIONS_TAB,
    );
  }

  get aboutTab(): EncapsulatedElementType {
    return Matchers.getElementByID(PredictMarketDetailsSelectorsIDs.ABOUT_TAB);
  }

  get outcomesTab(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB,
    );
  }

  //TODO: Add the correct TESTID on the component for the about tab content
  // This was migrated from the old screen-objects/PredictDetailsScreen.js file
  get aboutTabContent(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.ABOUT_TAB_CONTENT,
    );
  }

  //TODO: Add the correct TESTID on the component for the outcomes tab content
  // This was migrated from the old screen-objects/PredictDetailsScreen.js file
  get outcomesTabContent(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB_CONTENT,
    );
  }

  get cashOutButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON,
    );
  }

  get claimButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON,
    );
  }

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictMarketDetailsSelectorsIDs.BACK_BUTTON,
    );
  }

  private get backButtonByLabel(): EncapsulatedElementType {
    return Matchers.getElementByText('Back');
  }

  get balanceCard(): EncapsulatedElementType {
    return Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD);
  }

  get placeBetButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON,
    );
  }

  get volumeLabel(): EncapsulatedElementType {
    return Matchers.getElementByText('Volume');
  }

  private getOpenPositionValueButton(): EncapsulatedElementType {
    return Matchers.getElementByNativeXPath(
      `//*[ (contains(@text,'Celtics') and contains(@text,'83¢')) or (contains(@label,'Celtics') and contains(@label,'83¢')) or (contains(@name,'Celtics') and contains(@name,'83¢')) ]`,
    );
  }

  private getKeypadDigitButton(digit: string): EncapsulatedElementType {
    const testID = digit === '.' ? 'keypad-key-dot' : `keypad-key-${digit}`;
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByText(digit);
    }
    return Matchers.getElementByID(testID);
  }

  private getDoneButton(): EncapsulatedElementType {
    return Matchers.getElementByNativeXPath(
      `//*[(@text='Done' or @content-desc='Done' or @label='Done' or @name='Done')]`,
      { lastElement: true },
    );
  }

  private getContinueButton(): EncapsulatedElementType {
    return Matchers.getElementByText('Continue');
  }

  get gameBetYesButton(): EncapsulatedElementType {
    const testID = `${PREDICT_GAME_DETAILS_FOOTER}${PREDICT_GAME_DETAILS_FOOTER_TEST_IDS.ACTION_BUTTONS}${PREDICT_ACTION_BUTTONS_TEST_IDS.PREDICT_BET_BUTTON}${PREDICT_BET_BUTTONS_TEST_IDS.PREDICT_BET_BUTTON_YES}`;
    return Matchers.getElementByID(testID);
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
    const tapBack = async (target: EncapsulatedElementType) => {
      await Assertions.expectElementToBeVisible(target, {
        description: 'Market details back button',
        timeout: 10_000,
      });
      await Gestures.waitAndTap(target, {
        elemDescription: 'Back button',
        timeout: 30_000,
      });
    };

    try {
      await tapBack(this.backButton);
    } catch {
      try {
        await tapBack(this.backButtonByLabel);
      } catch {
        const drv = getDriver();
        if (!drv) {
          throw new Error(
            'WebDriver session not available for back navigation',
          );
        }
        await drv.back();
      }
    }
  }

  async tapPositionsTab(): Promise<void> {
    await Gestures.waitAndTap(this.positionsTab, {
      elemDescription: 'Positions tab',
    });
  }

  async tapAboutTab(): Promise<void> {
    await Gestures.waitAndTap(this.aboutTab, {
      elemDescription: 'About tab',
      checkForDisplayed: false,
    });
  }

  async tapOutcomesTab(): Promise<void> {
    await Gestures.waitAndTap(this.outcomesTab, {
      elemDescription: 'Outcomes tab',
      checkForDisplayed: false,
    });
  }

  async tapCashOutButton(): Promise<void> {
    await Gestures.waitAndTap(this.cashOutButton, {
      elemDescription: 'Cash out button',
    });
  }

  getGameCashOutButton(positionId: string): EncapsulatedElementType {
    const testID = `${PREDICT_PICK_ITEM_TEST_IDS.PREDICT_PICKS_CASH_OUT_BUTTON}-${positionId}`;
    return Matchers.getElementByID(testID);
  }

  private get gameDetailsScrollView(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PREDICT_GAME_DETAILS_CONTENT_TEST_IDS.SCROLL_VIEW,
    );
  }

  private async scrollMarketDetailsDown(percent = 0.45): Promise<void> {
    await Gestures.swipe(this.gameDetailsScrollView, 'up', {
      percentage: percent,
      elemDescription: 'Scroll game market details down',
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
    await this.scrollMarketDetailsToRevealCashOut(positionId, timeout);
  }

  async tapGameCashOutButton(positionId: string): Promise<void> {
    await this.scrollMarketDetailsToRevealCashOut(
      positionId,
      resolveE2EWaitTimeoutMs(30_000),
    );
    await Gestures.waitAndTap(this.getGameCashOutButton(positionId), {
      elemDescription: 'Game details cash out button',
      timeout: 30_000,
    });
  }

  async tapOpenPositionValue(): Promise<void> {
    await Gestures.waitAndTap(this.getOpenPositionValueButton(), {
      elemDescription: 'Celtics outcome button',
    });
  }

  async tapGameBetYesButton(): Promise<void> {
    await Gestures.waitAndTap(this.gameBetYesButton, {
      elemDescription: 'Game bet yes button',
    });
  }

  async tapPositionAmount(amount: string): Promise<void> {
    const digits = amount.split('');

    for (const digit of digits) {
      await Gestures.waitAndTap(this.getKeypadDigitButton(digit), {
        elemDescription: `Tap ${digit} on keypad`,
      });
    }
  }

  async tapDoneButton(): Promise<void> {
    await Gestures.waitAndTap(this.getDoneButton(), {
      elemDescription: 'Done button',
    });
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.waitAndTap(this.getContinueButton(), {
      elemDescription: 'Continue button',
    });
  }

  async tapOpenPosition(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.placeBetButton, {
      description: 'Place bet button before submitting order',
      timeout: 30_000,
    });
    await Gestures.waitAndTap(this.placeBetButton, {
      elemDescription: 'Place bet button',
      delay: 1000,
      checkStability: true,
    });
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Market details screen after order submission',
      timeout: 60_000,
    });
  }

  async tapClaimWinningsButton(): Promise<void> {
    await Gestures.waitAndTap(this.claimButton, {
      elemDescription: 'Tap claim winnings button on market details page',
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
