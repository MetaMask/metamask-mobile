import { BottomSheetSelectorIDs, OnboardingSelectorIDs } from '../../selectors/Onboarding/Onboarding.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class OnboardingBottomSheetView {
  get container() {
    return Matchers.getElementByID(BottomSheetSelectorIDs.CONTAINER_ID);
  }

  get srpButton() {
    return Matchers.getElementByID(BottomSheetSelectorIDs.SRP_BUTTON);
  }

  get googleButton() {
    return Matchers.getElementByID(BottomSheetSelectorIDs.GOOGLE_BUTTON);
  }

  get appleButton() {
    return Matchers.getElementByID(BottomSheetSelectorIDs.APPLE_BUTTON);
  }

  async tapSrpButton() {
    await Gestures.waitAndTap(this.srpButton);
  }

  async tapGoogleButton() {
    await Gestures.waitAndTap(this.googleButton);
  }

  async tapAppleButton() {
    await Gestures.waitAndTap(this.appleButton);
  }
}

export default new OnboardingBottomSheetView();