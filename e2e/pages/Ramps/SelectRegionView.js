import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { SelectRegionSelectors } from '../../selectors/Ramps/SelectRegion.selectors';

class SelectRegionView {
  get selectRegionDropdown() {
    return Matchers.getElementByText(SelectRegionSelectors.SELECT_REGION);
  }

  get continueButton() {
    return Matchers.getElementByText(SelectRegionSelectors.CONTINUE_BUTTON);
  }

  async tapSelectRegionDropdown() {
    await Gestures.waitAndTap(this.selectRegionDropdown);
  }

  async tapRegionOption(region) {
    const regionOption = Matchers.getElementByText(region);
    await Gestures.waitAndTap(regionOption);
  }

  async tapContinueButton() {
    await Gestures.waitAndTap(this.continueButton);
  }
}

export default new SelectRegionView();
