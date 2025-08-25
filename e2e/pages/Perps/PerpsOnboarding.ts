import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PerpsTutorialSelectorsIDs } from '../../selectors/Perps/Perps.selectors';

class PerpsOnboarding {
  get continueButton(): DetoxElement {
    return Matchers.getElementByID(PerpsTutorialSelectorsIDs.CONTINUE_BUTTON);
  }

  get skipButton(): DetoxElement {
    return Matchers.getElementByID(PerpsTutorialSelectorsIDs.SKIP_BUTTON);
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Perps Tutorial Continue Button',
    });
  }

  async tapSkipButton(): Promise<void> {
    await Gestures.waitAndTap(this.skipButton, {
      elemDescription: 'Perps Tutorial Skip Button',
    });
  }
}

export default new PerpsOnboarding();
