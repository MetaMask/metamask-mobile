import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
} from '../../framework';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import { PredictPositionsViewSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';

class PredictPositions {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictPositionsViewSelectorsIDs.CONTAINER);
  }

  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PredictPositionsViewSelectorsIDs.BACK_BUTTON,
    );
  }

  get claimButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PredictPositionsViewSelectorsIDs.CLAIM_CTA);
  }

  async waitForScreenToDisplay(
    options: { timeout?: number; description?: string } = {},
  ): Promise<void> {
    const {
      timeout = resolveE2EWaitTimeoutMs(20_000),
      description = 'Predict Positions screen should be visible',
    } = options;

    await Assertions.expectElementToBeVisible(this.container, {
      timeout,
      description,
    });
  }

  async tapClaimButton(): Promise<void> {
    await Gestures.waitAndTap(this.claimButton, {
      elemDescription: 'Predict Positions claim winnings button',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back button on Predict Positions',
    });
  }
}

export default new PredictPositions();
