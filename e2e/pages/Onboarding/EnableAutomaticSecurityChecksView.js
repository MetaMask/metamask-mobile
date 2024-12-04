import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { EnableAutomaticSecurityChecksIDs } from '../../selectors/Onboarding/EnableAutomaticSecurityChecks.selectors';

class EnableAutomaticSecurityChecksView {
  get container() {
    return Matchers.getElementByID(EnableAutomaticSecurityChecksIDs.CONTAINER);
  }

  get noThanksButton() {
    return Matchers.getElementByID(EnableAutomaticSecurityChecksIDs.NO_THANKS_BUTTON);
  }

  async tapNoThanks() {
    await Gestures.waitAndTap(this.noThanksButton);
  }
}

export default new EnableAutomaticSecurityChecksView();
