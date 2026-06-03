import { FiatOnTestnetsBottomSheetSelectorsIDs } from '../../../../app/components/Views/Settings/AdvancedSettings/FiatOnTestnetsFriction/FiatOnTestnetsBottomSheet.testIds';
import Matchers from '../../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class FiatOnTestnetsBottomSheet {
  get continueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          FiatOnTestnetsBottomSheetSelectorsIDs.CONTINUE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          FiatOnTestnetsBottomSheetSelectorsIDs.CONTINUE_BUTTON,
        ),
    });
  }

  async tapContinueButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue Button in Fiat On Testnets Bottom Sheet',
    });
  }
}

export default new FiatOnTestnetsBottomSheet();
