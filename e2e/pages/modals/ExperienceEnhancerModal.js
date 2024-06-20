import { ExperienceEnhancerModalSelectorsIDs } from '../../selectors/Modals/ExperienceEnhancerModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class ExperienceEnhancerModal {
  get container() {
    return Matchers.getElementByID(
      ExperienceEnhancerModalSelectorsIDs.BOTTOM_SHEET,
    );
  }

  get iAgree() {
    return Matchers.getElementByID(
      ExperienceEnhancerModalSelectorsIDs.ACCEPT_BUTTON,
    );
  }

  get noThanks() {
    return Matchers.getElementByID(
      ExperienceEnhancerModalSelectorsIDs.CANCEL_BUTTON,
    );
  }

  async tapIagree() {
    await Gestures.waitAndTap(this.iAgree);
  }

  async tapNoThanks() {
    await Gestures.waitAndTap(this.noThanks);
  }
}

export default new ExperienceEnhancerModal();
