import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SelectRegionSelectors } from '../../selectors/Ramps/SelectRegion.selectors';
import { REGION_SELECTOR_TEST_IDS } from '../../../app/components/UI/Ramp/Views/Settings/RegionSelector/RegionSelector.testIds';
import { type AppiumElement } from '../../framework';

class SelectRegionView {
  get continueButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(SelectRegionSelectors.CONTINUE_BUTTON);
  }

  get regionSearchInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(REGION_SELECTOR_TEST_IDS.SEARCH_INPUT);
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
