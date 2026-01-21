import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SelectRegionSelectors } from '../../locators/Ramps/SelectRegion.selectors';

class SelectRegionView {
  get continueButton(): DetoxElement {
    return Matchers.getElementByText(SelectRegionSelectors.CONTINUE_BUTTON);
  }

  get regionSearchInput(): DetoxElement {
    return Matchers.getElementByID(
      SelectRegionSelectors.REGION_MODAL_SEARCH_INPUT,
    );
  }

  async tapRegionOption(region: string): Promise<void> {
    await Gestures.typeText(this.regionSearchInput, region, {
      elemDescription: 'Region Search Input',
      hideKeyboard: true,
    });
    const regionName = Matchers.getElementByText(region, 1);
    await Gestures.waitAndTap(regionName, {
      elemDescription: `Region "${region}" in Select Region View`,
    });
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue Button in Select Region View',
    });
  }
}

export default new SelectRegionView();
