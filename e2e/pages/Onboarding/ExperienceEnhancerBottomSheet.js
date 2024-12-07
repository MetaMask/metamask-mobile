import { ExperienceEnhancerBottomSheetSelectorsIDs } from '../../selectors/Onboarding/ExperienceEnhancerModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class ExperienceEnhancerBottomSheet {
  get container() {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.BOTTOM_SHEET,
    );
  }

  get iAgree() {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON,
    );
  }

  async tapIAgree() {
    await Gestures.waitAndTap(this.iAgree);
  }
}

export default new ExperienceEnhancerBottomSheet();
