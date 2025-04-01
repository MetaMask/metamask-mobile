import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { SelectRegionSelectors } from '../../selectors/Ramps/SelectRegion.selectors';

class SelectRegionView {
  get continueButton() {
    return Matchers.getElementByText(SelectRegionSelectors.CONTINUE_BUTTON);
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
