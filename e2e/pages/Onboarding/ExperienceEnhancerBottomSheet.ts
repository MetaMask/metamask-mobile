import { ExperienceEnhancerBottomSheetSelectorsIDs } from '../../selectors/Onboarding/ExperienceEnhancerModal.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class ExperienceEnhancerBottomSheet {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.BOTTOM_SHEET,
    );
  }

  get iAgree(): DetoxElement {
    return Matchers.getElementByID(
      ExperienceEnhancerBottomSheetSelectorsIDs.ACCEPT_BUTTON,
    );
  }

  async tapIAgree(): Promise<void> {
    await Gestures.waitAndTap(this.iAgree, {
      elemDescription: 'I Agree Button in Experience Enhancer Bottom Sheet',
    });
  }
}

export default new ExperienceEnhancerBottomSheet();
