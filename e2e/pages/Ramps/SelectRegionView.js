import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { SelectRegionSelectors } from '../../selectors/Ramps/SelectRegion.selectors';

class SelectRegionView {
  get continueButton() {
    return Matchers.getElementByText(SelectRegionSelectors.CONTINUE_BUTTON);
  }

  get regionSearchInput() {
    return Matchers.getElementByID(SelectRegionSelectors.REGION_MODAL_SEARCH_INPUT);
  }

  async tapRegionOption(region) {
    await Gestures.typeText(this.regionSearchInput, region), {
      hideKeyboard: true,
    };
    const regionName = Matchers.getElementByText(region, 1);
    await Gestures.waitAndTap(regionName, {
      checkEnabled: false,
    });
  }

  async tapContinueButton() {
    await Gestures.waitAndTap(this.continueButton);
  }
}

export default new SelectRegionView();
