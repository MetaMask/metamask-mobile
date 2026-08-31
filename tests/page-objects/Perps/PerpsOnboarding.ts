import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework';
import { PerpsTutorialSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';

class PerpsOnboarding {
  get continueButton(): EncapsulatedElementType {
    return Matchers.getElementByID(PerpsTutorialSelectorsIDs.CONTINUE_BUTTON);
  }

  get skipButton(): EncapsulatedElementType {
    return Matchers.getElementByID(PerpsTutorialSelectorsIDs.SKIP_BUTTON);
  }

  /** Add funds button - wdio uses getElementByCatchAll('Add funds') */
  get addFundsButton(): EncapsulatedElementType {
    return Matchers.getElementByText('Add funds');
  }

  /** Tutorial title for isContainerDisplayed - wdio uses getElementByCatchAll('What are perps?') */
  get tutorialTitle(): EncapsulatedElementType {
    return Matchers.getElementByText('What are perps?');
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

  async tapAddFunds(): Promise<void> {
    await Gestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Add funds button',
    });
  }
}

export default new PerpsOnboarding();
