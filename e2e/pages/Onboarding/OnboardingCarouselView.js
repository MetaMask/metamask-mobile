import TestHelpers from '../../helpers';
import {
  WELCOME_SCREEN_CAROUSEL_TITLE_ID,
  WELCOME_SCREEN_GET_STARTED_BUTTON_ID,
} from '../../../wdio/screen-objects/testIDs/Screens/WelcomeScreen.testIds';

const ONBOARDING_CAROUSEL_ID = 'welcome-screen-carousel-container-id';

const CAROUSEL_SCREEN_ONE_IMAGE_ID = 'carousel-one-image';
const CAROUSEL_SCREEN_TWO_IMAGE_ID = 'carousel-two-image';
const CAROUSEL_SCREEN_THREE_IMAGE_ID = 'carousel-three-image';

export default class OnboardingCarouselView {
  static async swipeCarousel() {
    await TestHelpers.swipe(ONBOARDING_CAROUSEL_ID, 'left');
  }
  static async tapOnGetStartedButton() {
    await TestHelpers.waitAndTap(WELCOME_SCREEN_GET_STARTED_BUTTON_ID);
  }

  static async isMetaMaskWelcomeTextVisible() {
    await TestHelpers.checkIfElementHasString(
      ONBOARDING_CAROUSEL_ID,
      'Welcome to MetaMask',
    );
  }
  static async isWelcomeToMetaMaskImageVisible() {
    await TestHelpers.checkIfVisible(CAROUSEL_SCREEN_ONE_IMAGE_ID);
  }

  static async isManageYourDigitalTextVisible() {
    await TestHelpers.checkIfElementHasString(
      WELCOME_SCREEN_CAROUSEL_TITLE_ID(2),
      'Manage your digital assets',
    );
  }

  static async isManageYourDigitalImageVisible() {
    await TestHelpers.checkIfVisible(CAROUSEL_SCREEN_TWO_IMAGE_ID);
  }

  static async isYourGatewayToWeb3TextVisible() {
    await TestHelpers.checkIfElementHasString(
      WELCOME_SCREEN_CAROUSEL_TITLE_ID(3),
      'Your gateway to web3',
    );
  }

  static async isYourGatewayToWeb3ImageVisible() {
    await TestHelpers.checkIfVisible(CAROUSEL_SCREEN_THREE_IMAGE_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ONBOARDING_CAROUSEL_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ONBOARDING_CAROUSEL_ID);
  }
}
