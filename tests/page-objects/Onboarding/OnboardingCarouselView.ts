import {
  OnboardingCarouselSelectorIDs,
  OnboardingCarouselSelectorText,
} from '../../selectors/Onboarding/OnboardingCarousel.selectors';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class OnboardingCarouselView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          OnboardingCarouselSelectorIDs.CAROUSEL_CONTAINER_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingCarouselSelectorIDs.CAROUSEL_CONTAINER_ID,
        ),
    });
  }

  get getStartedButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID,
        ),
    });
  }

  get titleOne(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_ONE),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          OnboardingCarouselSelectorText.TITLE_ONE,
        ),
    });
  }

  get imageOne(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingCarouselSelectorIDs.ONE_IMAGE_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingCarouselSelectorIDs.ONE_IMAGE_ID,
        ),
    });
  }

  get titleTwo(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_TWO),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          OnboardingCarouselSelectorText.TITLE_TWO,
        ),
    });
  }

  get imageTwo(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingCarouselSelectorIDs.TWO_IMAGE_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingCarouselSelectorIDs.TWO_IMAGE_ID,
        ),
    });
  }

  get titleThree(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(OnboardingCarouselSelectorText.TITLE_THREE),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          OnboardingCarouselSelectorText.TITLE_THREE,
        ),
    });
  }

  get imageThree(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingCarouselSelectorIDs.THREE_IMAGE_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingCarouselSelectorIDs.THREE_IMAGE_ID,
        ),
    });
  }

  async swipeCarousel(): Promise<void> {
    await UnifiedGestures.swipe(this.container, 'left');
  }

  async tapOnGetStartedButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getStartedButton, {
      elemDescription: 'Onboarding Carousel Get Started Button',
    });
  }
}

export default new OnboardingCarouselView();
