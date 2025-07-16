import {
  OnboardingCarouselSelectorIDs,
  OnboardingCarouselSelectorText,
} from '../../selectors/Onboarding/OnboardingCarousel.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class OnboardingCarouselView {
  get container() {
    return Matchers.getElementByID(
      OnboardingCarouselSelectorIDs.CAROUSEL_CONTAINER_ID,
    );
  }

  get getStartedButton() {
    return Matchers.getElementByID(
      OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID,
    );
  }

  get titleOne() {
    return Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_ONE);
  }

  get imageOne() {
    return Matchers.getElementByID(OnboardingCarouselSelectorIDs.ONE_IMAGE_ID);
  }

  get titleTwo() {
    return Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_TWO);
  }

  get imageTwo() {
    return Matchers.getElementByID(OnboardingCarouselSelectorIDs.TWO_IMAGE_ID);
  }

  get titleThree() {
    return Matchers.getElementByText(
      OnboardingCarouselSelectorText.TITLE_THREE,
    );
  }

  get imageThree() {
    return Matchers.getElementByID(
      OnboardingCarouselSelectorIDs.THREE_IMAGE_ID,
    );
  }

  async swipeCarousel() {
    await Gestures.swipe(this.container, 'left');
  }

  async tapOnGetStartedButton() {
    await Gestures.waitAndTap(this.getStartedButton, {
      elemDescription: 'Onboarding Carousel Get Started Button',
    });
  }
}

export default new OnboardingCarouselView();
