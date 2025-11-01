import { Matchers, Gestures } from '../../framework';
import { PredictClaimConfirmationSelectorsIDs } from '../../selectors/Predict/Predict.selectors';

class PredictClaimPage {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      PredictClaimConfirmationSelectorsIDs.CLAIM_BACKGROUND_CONTAINER,
    );
  }
  get claimConfirmButton(): DetoxElement {
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
