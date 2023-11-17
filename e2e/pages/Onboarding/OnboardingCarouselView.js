import TestHelpers from '../../helpers';
import {
  WELCOME_SCREEN_CAROUSEL_TITLE_ID,
  WELCOME_SCREEN_GET_STARTED_BUTTON_ID,
} from '../../../wdio/screen-objects/testIDs/Screens/WelcomeScreen.testIds';
import { OnboardingCarouselSelectorIDs } from '../../selectors/Onboarding/OnboardingCarousel.selectors';

export default class OnboardingCarouselView {
  static async swipeCarousel() {
    await TestHelpers.swipe(OnboardingCarouselSelectorIDs.CONTAINER_ID, 'left');
  }

  static async tapOnGetStartedButton() {
    await TestHelpers.waitAndTap(WELCOME_SCREEN_GET_STARTED_BUTTON_ID);
  }

  static async isGetStartedButtonVisible() {
    await TestHelpers.checkIfVisible(WELCOME_SCREEN_GET_STARTED_BUTTON_ID);
  }

  static async isMetaMaskWelcomeTextVisible() {
    await TestHelpers.checkIfElementHasString(
      OnboardingCarouselSelectorIDs.CONTAINER_ID,
      'Welcome to MetaMask',
    );
  }

  static async isWelcomeToMetaMaskImageVisible() {
    await TestHelpers.checkIfVisible(
      OnboardingCarouselSelectorIDs.ONE_IMAGE_ID,
    );
  }

  static async isManageYourDigitalTextVisible() {
    await TestHelpers.checkIfElementHasString(
      WELCOME_SCREEN_CAROUSEL_TITLE_ID(2),
      'Manage your digital assets',
    );
  }

  static async isManageYourDigitalImageVisible() {
    await TestHelpers.checkIfVisible(
      OnboardingCarouselSelectorIDs.TWO_IMAGE_ID,
    );
  }

  static async isYourGatewayToWeb3TextVisible() {
    await TestHelpers.checkIfElementHasString(
      WELCOME_SCREEN_CAROUSEL_TITLE_ID(3),
      'Your gateway to web3',
    );
  }

  static async isYourGatewayToWeb3ImageVisible() {
    await TestHelpers.checkIfVisible(
      OnboardingCarouselSelectorIDs.THREE_IMAGE_ID,
    );
  }

  static async isVisible() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.checkIfVisible(
        OnboardingCarouselSelectorIDs.CONTAINER_ID,
      );
    }
  }
}
