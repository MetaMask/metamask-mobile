import { FiatOnTestnetsBottomSheetSelectorsIDs } from '../../../../app/components/Views/Settings/AdvancedSettings/FiatOnTestnetsFriction/FiatOnTestnetsBottomSheet.testIds';
import Gestures from '../../../../tests/framework/Gestures';
import Matchers from '../../../../tests/framework/Matchers';

class FiatOnTestnetsBottomSheet {
  get continueButton(): DetoxElement {
    return Matchers.getElementByID(
      FiatOnTestnetsBottomSheetSelectorsIDs.CONTINUE_BUTTON,
    );
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue Button in Fiat On Testnets Bottom Sheet',
    });
  }
}

export default new FiatOnTestnetsBottomSheet();
