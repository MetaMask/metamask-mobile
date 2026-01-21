import {
  OnboardingCarouselSelectorIDs,
  OnboardingCarouselSelectorText,
} from '../../locators/Onboarding/OnboardingCarousel.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class OnboardingCarouselView {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      OnboardingCarouselSelectorIDs.CAROUSEL_CONTAINER_ID,
    );
  }

  get getStartedButton(): DetoxElement {
    return Matchers.getElementByID(
      OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID,
    );
  }

  get titleOne(): DetoxElement {
    return Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_ONE);
  }

  get imageOne(): DetoxElement {
    return Matchers.getElementByID(OnboardingCarouselSelectorIDs.ONE_IMAGE_ID);
  }

  get titleTwo(): DetoxElement {
    return Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_TWO);
  }

  get imageTwo(): DetoxElement {
    return Matchers.getElementByID(OnboardingCarouselSelectorIDs.TWO_IMAGE_ID);
  }

  get titleThree(): DetoxElement {
    return Matchers.getElementByText(
      OnboardingCarouselSelectorText.TITLE_THREE,
    );
  }

  get imageThree(): DetoxElement {
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
