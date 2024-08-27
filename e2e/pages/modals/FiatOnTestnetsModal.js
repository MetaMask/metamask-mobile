import { FiatOnTestnetsModalSelectorsIDs } from '../../selectors/Modals/FiatOnTestnetsModal.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class FiatOnTestnetsModal {
  get continueButton() {
    return Matchers.getElementByID(
      FiatOnTestnetsModalSelectorsIDs.CONTINUE_BUTTON,
    );
  }

  async tapContinueButton() {
    await Gestures.waitAndTap(this.continueButton);
  }
}

export default new FiatOnTestnetsModal();
