import Gestures from '../../framework/Gestures.ts';
import Matchers from '../../framework/Matchers.ts';
import { PerpsTutorialSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds.ts';

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
