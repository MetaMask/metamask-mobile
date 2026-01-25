import { ExperienceEnhancerBottomSheetSelectorsIDs } from '../../../app/components/Views/ExperienceEnhancerModal/ExperienceEnhancerModal.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';

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
