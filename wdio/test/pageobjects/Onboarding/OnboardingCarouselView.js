import Gestures from '../Gestures';

const ONBOARDING_CAROUSEL_ID = 'onboarding-carousel-screen';
const GET_STARTED_BUTTON_ID = 'onboarding-get-started-button';
const CAROUSEL_SCREEN_TWO_ID = 'carousel-screen-two';
const CAROUSEL_SCREEN_THREE_ID = 'carousel-screen-three';

const CAROUSEL_SCREEN_ONE_IMAGE_ID = 'carousel-one-image';
const CAROUSEL_SCREEN_TWO_IMAGE_ID = 'carousel-two-image';
const CAROUSEL_SCREEN_THREE_IMAGE_ID = 'carousel-three-image';

class OnboardingCarouselView {
  get onboardingCarouselContainer() {
    return $(`~${ONBOARDING_CAROUSEL_ID}`);
  }

  async swipeCarousel() {
    await Gestures.swipeLeft();
    await Gestures.swipeLeft();
  }

  async tapOnGetStartedButton() {
    await Gestures.tap(GET_STARTED_BUTTON_ID);
  }

  async isMetaMaskWelcomeTextVisible() {
    await TestHelpers.checkIfElementHasString(
      ONBOARDING_CAROUSEL_ID,
      'Welcome to MetaMask',
    );
  }
  async isWelcomeToMetaMaskImageVisible() {
    await TestHelpers.checkIfVisible(CAROUSEL_SCREEN_ONE_IMAGE_ID);
  }

  async isManageYourDigitalTextVisible() {
    await TestHelpers.checkIfElementHasString(
      CAROUSEL_SCREEN_TWO_ID,
      'Manage your digital assets',
    );
  }

  async isManageYourDigitalImageVisible() {
    await TestHelpers.checkIfVisible(CAROUSEL_SCREEN_TWO_IMAGE_ID);
  }

  async isYourGatewayToWeb3TextVisible() {
    await TestHelpers.checkIfElementHasString(
      CAROUSEL_SCREEN_THREE_ID,
      'Your gateway to web3',
    );
  }

  async isYourGatewayToWeb3ImageVisible() {
    await TestHelpers.checkIfVisible(CAROUSEL_SCREEN_THREE_IMAGE_ID);
  }

  async isVisible() {
    await expect(this.onboardingCarouselContainer).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.onboardingCarouselContainer).not.toBeDisplayed();
  }
}
export default new OnboardingCarouselView();
