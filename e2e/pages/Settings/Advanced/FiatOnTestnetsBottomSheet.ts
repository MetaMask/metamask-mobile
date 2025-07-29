import { FiatOnTestnetsBottomSheetSelectorsIDs } from '../../../selectors/Settings/Advanced/FiatOnTestnetsBottomSheet.selectors';
import Gestures from '../../../framework/Gestures';
import Matchers from '../../../framework/Matchers';

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
