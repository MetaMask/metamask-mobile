import {
  Assertions,
  Matchers,
  PlaywrightMatchers,
  encapsulated,
  type EncapsulatedElementType,
} from '../../framework';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import { PredictCryptoUpDownDetailsSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';

class PredictCryptoUpDownDetailsPage {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PredictCryptoUpDownDetailsSelectorsIDs.SCREEN),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictCryptoUpDownDetailsSelectorsIDs.SCREEN,
          { exact: true },
        ),
    });
  }

  async waitForScreenToDisplay(
    options: { timeout?: number; description?: string } = {},
  ): Promise<void> {
    const {
      timeout = resolveE2EWaitTimeoutMs(30_000),
      description = 'Predict crypto up/down details screen',
    } = options;

    await Assertions.expectElementToBeVisible(this.container, {
      timeout,
      description,
    });
  }
}

export default new PredictCryptoUpDownDetailsPage();
