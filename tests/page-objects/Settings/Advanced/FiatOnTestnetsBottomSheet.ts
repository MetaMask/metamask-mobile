import { FiatOnTestnetsBottomSheetSelectorsIDs } from '../../../../app/components/Views/Settings/AdvancedSettings/FiatOnTestnetsFriction/FiatOnTestnetsBottomSheet.testIds';
import Gestures from '../../../framework/Gestures';
import Matchers from '../../../framework/Matchers';
import { EncapsulatedElementType } from '../../../framework';

class FiatOnTestnetsBottomSheet {
  get continueButton(): EncapsulatedElementType {
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
