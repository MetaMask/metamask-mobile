import {
  OnboardingCarouselSelectorIDs,
  OnboardingCarouselSelectorText,
} from '../../selectors/Onboarding/OnboardingCarousel.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class OnboardingCarouselView {
  get container() {
    return Matchers.getElementByID(OnboardingCarouselSelectorIDs.CONTAINER_ID);
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
    await Gestures.waitAndTap(this.getStartedButton);
  }
}

export default new OnboardingCarouselView();
