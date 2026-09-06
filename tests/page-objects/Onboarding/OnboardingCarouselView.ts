import { OnboardingCarouselSelectorText } from '../../selectors/Onboarding/OnboardingCarousel.selectors';
import { OnboardingSheetSelectorIDs } from '../../../app/components/Views/OnboardingSheet/OnboardingSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';

/**
 * Legacy carousel PO — welcome carousel IDs were removed from the app.
 * Container / CTA now map to OnboardingSheet; title assertions remain text-based.
 */
class OnboardingCarouselView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(OnboardingSheetSelectorIDs.CONTAINER_ID);
  }

  get getStartedButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      OnboardingSheetSelectorIDs.IMPORT_SEED_BUTTON,
    );
  }

  get titleOne(): Promise<AppiumElement> {
    return Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_ONE);
  }

  get titleTwo(): Promise<AppiumElement> {
    return Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_TWO);
  }

  get titleThree(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      OnboardingCarouselSelectorText.TITLE_THREE,
    );
  }

  async swipeCarousel(): Promise<void> {
    await Gestures.swipe(this.container, 'left');
  }

  async tapOnGetStartedButton(): Promise<void> {
    await Gestures.waitAndTap(this.getStartedButton, {
      elemDescription: 'Onboarding sheet import seed button',
    });
  }
}

export default new OnboardingCarouselView();
