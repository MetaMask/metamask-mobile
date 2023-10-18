import TestHelpers from '../../helpers';
import {
  WELCOME_SCREEN_CAROUSEL_TITLE_ID,
  WELCOME_SCREEN_GET_STARTED_BUTTON_ID,
} from '../../../wdio/screen-objects/testIDs/Screens/WelcomeScreen.testIds';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

/*
These should live in a testID folder
*/
const ONBOARDING_CAROUSEL_ID = 'onboarding-carouselcarousel-screen--screen';

const CAROUSEL_SCREEN_ONE_IMAGE_ID = 'carousel-one-image';
const CAROUSEL_SCREEN_TWO_IMAGE_ID = 'carousel-two-image';
const CAROUSEL_SCREEN_THREE_IMAGE_ID = 'carousel-three-image';

class OnboardingCarouselView {
  get welcomeButton() {
    return Matchers.getElementByID(WELCOME_SCREEN_GET_STARTED_BUTTON_ID);
  }

  get carosuelScreenOneImageID() {
    return Matchers.getElementByID(CAROUSEL_SCREEN_ONE_IMAGE_ID);
  }
  get carosuelScreenTwoImageID() {
    return Matchers.getElementByID(CAROUSEL_SCREEN_TWO_IMAGE_ID);
  }
  get carosuelScreenThreeImageID() {
    return Matchers.getElementByID(CAROUSEL_SCREEN_THREE_IMAGE_ID);
  }

  async swipeCarousel() {
    await TestHelpers.swipe(ONBOARDING_CAROUSEL_ID, 'left');
  }
  async tapOnGetStartedButton() {
    await Gestures.tapAndLongPress(this.welcomeButton);
  }

  async isGetStartedButtonVisible() {
    await TestHelpers.checkIfVisible(WELCOME_SCREEN_GET_STARTED_BUTTON_ID);
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
      WELCOME_SCREEN_CAROUSEL_TITLE_ID(2),
      'Manage your digital assets',
    );
  }

  async isManageYourDigitalImageVisible() {
    await TestHelpers.checkIfVisible(CAROUSEL_SCREEN_TWO_IMAGE_ID);
  }

  async isYourGatewayToWeb3TextVisible() {
    await TestHelpers.checkIfElementHasString(
      WELCOME_SCREEN_CAROUSEL_TITLE_ID(3),
      'Your gateway to web3',
    );
  }

  async isYourGatewayToWeb3ImageVisible() {
    await TestHelpers.checkIfVisible(CAROUSEL_SCREEN_THREE_IMAGE_ID);
  }

  async isVisible() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.checkIfVisible(ONBOARDING_CAROUSEL_ID);
    }
  }

  async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ONBOARDING_CAROUSEL_ID);
  }
}
export default new OnboardingCarouselView();
