import { Matchers, Gestures, EncapsulatedElementType } from '../../framework';
import { PredictClaimConfirmationSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';

class PredictClaimPage {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictClaimConfirmationSelectorsIDs.CLAIM_BACKGROUND_CONTAINER,
    );
  }
  get claimConfirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      PredictClaimConfirmationSelectorsIDs.CLAIM_CONFIRM_BUTTON,
    );
  }
  async tapClaimConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.claimConfirmButton, {
      elemDescription: 'Claim confirm button',
    });
  }
}

export default new PredictClaimPage();
