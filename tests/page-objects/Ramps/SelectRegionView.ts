import Matchers from '../../framework/Matchers';
import { SelectRegionSelectors } from '../../selectors/Ramps/SelectRegion.selectors';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SelectRegionView {
  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(SelectRegionSelectors.CONTINUE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          SelectRegionSelectors.CONTINUE_BUTTON,
        ),
    });
  }

  get regionSearchInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SelectRegionSelectors.REGION_MODAL_SEARCH_INPUT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SelectRegionSelectors.REGION_MODAL_SEARCH_INPUT,
        ),
    });
  }

  async tapRegionOption(region: string): Promise<void> {
    await UnifiedGestures.typeText(this.regionSearchInput, region, {
      elemDescription: 'Region Search Input',
      hideKeyboard: true,
    });
    const regionName = Matchers.getElementByText(region, 1);
    await UnifiedGestures.waitAndTap(regionName, {
      elemDescription: `Region "${region}" in Select Region View`,
    });
  }

  async tapContinueButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue Button in Select Region View',
    });
  }
}

export default new SelectRegionView();
