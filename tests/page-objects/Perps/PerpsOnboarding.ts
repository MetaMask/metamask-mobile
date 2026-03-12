import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { PerpsTutorialSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';

class PerpsOnboarding {
  get continueButton(): DetoxElement {
    return Matchers.getElementByID(PerpsTutorialSelectorsIDs.CONTINUE_BUTTON);
  }

  get skipButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsTutorialSelectorsIDs.SKIP_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsTutorialSelectorsIDs.SKIP_BUTTON,
          { exact: true },
        ),
    });
  }

  /** Add funds button - wdio uses getElementByCatchAll('Add funds') */
  get addFundsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Add funds'),
      appium: () => PlaywrightMatchers.getElementByCatchAll('Add funds'),
    });
  }

  /** Tutorial title for isContainerDisplayed - wdio uses getElementByCatchAll('What are perps?') */
  get tutorialTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('What are perps?'),
      appium: () => PlaywrightMatchers.getElementByCatchAll('What are perps?'),
    });
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Perps Tutorial Continue Button',
    });
  }

  async tapSkipButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.skipButton, {
      description: 'Perps Tutorial Skip Button',
    });
  }

  async tapAddFunds(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.addFundsButton, {
      description: 'Add funds button',
    });
  }
}

export default new PerpsOnboarding();
