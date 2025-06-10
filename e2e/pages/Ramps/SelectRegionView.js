import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { SelectRegionSelectors } from '../../selectors/Ramps/SelectRegion.selectors';

class SelectRegionView {
  get continueButton() {
    return Matchers.getElementByText(SelectRegionSelectors.CONTINUE_BUTTON);
  }

  get regionSearchInput() {
    return Matchers.getElementByID(SelectRegionSelectors.REGION_MODAL_SEARCH_INPUT);
  }

  async tapRegionOption(region) {
    await Gestures.typeTextAndHideKeyboard(this.regionSearchInput, region);
    const regionName = Matchers.getElementByText(region, 1);
    await Gestures.waitAndTap(regionName);
  }

  async tapContinueButton() {
    await Gestures.waitAndTap(this.continueButton);
  }
}

export default new SelectRegionView();
