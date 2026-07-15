import {
  OnboardingCarouselSelectorIDs,
  OnboardingCarouselSelectorText,
} from '../../selectors/Onboarding/OnboardingCarousel.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework';

class OnboardingCarouselView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingCarouselSelectorIDs.CAROUSEL_CONTAINER_ID,
    );
  }

  get getStartedButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID,
    );
  }

  get titleOne(): EncapsulatedElementType {
    return Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_ONE);
  }

  get imageOne(): EncapsulatedElementType {
    return Matchers.getElementByID(OnboardingCarouselSelectorIDs.ONE_IMAGE_ID);
  }

  get titleTwo(): EncapsulatedElementType {
    return Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_TWO);
  }

  get imageTwo(): EncapsulatedElementType {
    return Matchers.getElementByID(OnboardingCarouselSelectorIDs.TWO_IMAGE_ID);
  }

  get titleThree(): EncapsulatedElementType {
    return Matchers.getElementByText(
      OnboardingCarouselSelectorText.TITLE_THREE,
    );
  }

  get imageThree(): EncapsulatedElementType {
    return Matchers.getElementByID(
      OnboardingCarouselSelectorIDs.THREE_IMAGE_ID,
    );
  }

  async swipeCarousel(): Promise<void> {
    await Gestures.swipe(this.container, 'left');
  }

  async tapOnGetStartedButton(): Promise<void> {
    await Gestures.waitAndTap(this.getStartedButton, {
      elemDescription: 'Onboarding Carousel Get Started Button',
    });
  }
}

export default new OnboardingCarouselView();
