import { Matchers } from '../../framework';
import { PredictClaimConfirmationSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class PredictClaimPage {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PredictClaimConfirmationSelectorsIDs.CLAIM_BACKGROUND_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictClaimConfirmationSelectorsIDs.CLAIM_BACKGROUND_CONTAINER,
        ),
    });
  }
  get claimConfirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PredictClaimConfirmationSelectorsIDs.CLAIM_CONFIRM_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PredictClaimConfirmationSelectorsIDs.CLAIM_CONFIRM_BUTTON,
        ),
    });
  }
  async tapClaimConfirmButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.claimConfirmButton, {
      elemDescription: 'Claim confirm button',
    });
  }
}

export default new PredictClaimPage();
