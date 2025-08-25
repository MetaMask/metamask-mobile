import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class PerpsOnboarding {
  get continueButton(): DetoxElement {
    return Matchers.getElementByID('perps-tutorial-continue-button');
  }

  get skipButton(): DetoxElement {
    return Matchers.getElementByID('perps-tutorial-skip-button');
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
