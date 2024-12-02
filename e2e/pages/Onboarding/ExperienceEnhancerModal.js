import { ExperienceEnhancerModalSelectorsIDs } from '../../selectors/Onboarding/ExperienceEnhancerModal.selectors';
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

  async tapIAgree() {
    await Gestures.waitAndTap(this.iAgree);
  }
}

export default new ExperienceEnhancerModal();
