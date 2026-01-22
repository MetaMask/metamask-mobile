
import { ExperienceEnhancerBottomSheetSelectorsIDs } from '../../../app/components/Views/ExperienceEnhancerModal/ExperienceEnhancerModal.testIds';
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';


class ExperienceEnhancerModal {
  get container() {
    return Selectors.getXpathElementByResourceId(
      ExperienceEnhancerBottomSheetSelectorsIDs.BOTTOM_SHEET,
    );
  }

  get noThanks() {
    return Selectors.getXpathElementByResourceId(
      ExperienceEnhancerBottomSheetSelectorsIDs.CANCEL_BUTTON,
    );
  }

  async waitForDisplay() {
    const element = await this.container;
    await element.waitForDisplayed();
  }

  async waitForDisappear() {
    const element = await this.container;
    await element.waitForExist({ reverse: true });
  }

  async tapNoThanks() {
    await Gestures.waitAndTap(this.noThanks);
  }
}

export default new ExperienceEnhancerModal();
