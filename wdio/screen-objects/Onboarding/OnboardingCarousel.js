import {
  WELCOME_SCREEN_CAROUSEL_CONTAINER_ID,
  WELCOME_SCREEN_CAROUSEL_TITLE_ID,
} from '../testIDs/Screens/WelcomeScreen.testIds';
import { SPLASH_SCREEN_METAMASK_ANIMATION_ID } from '../testIDs/Components/MetaMaskAnimation.testIds';
import { OnboardingCarouselSelectorIDs } from '../../../e2e/selectors/Onboarding/OnboardingCarousel.selectors'
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';
import AppwrightSelectors from '../../helpers/AppwrightSelectors';
import { expect as appwrightExpect } from 'appwright';

class WelcomeScreen  {
  constructor() {
    this.CAROUSEL_RECTANGLES = null;
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get splashScreenMetamaskAnimationId() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        SPLASH_SCREEN_METAMASK_ANIMATION_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, SPLASH_SCREEN_METAMASK_ANIMATION_ID);
    }
  }

  get getStartedButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID);
    }
  }

  get screen() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        OnboardingCarouselSelectorIDs.CONTAINER_ID,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, OnboardingCarouselSelectorIDs.CONTAINER_ID);
    }
  }

  async getLaunchDuration() {
    if (!this._device) {
      return await Selectors.getXpathElementByResourceId(
        OnboardingCarouselSelectorIDs.APP_START_TIME_ID,
      );
    } else {
      return await AppwrightSelectors.getElementByID(this._device, OnboardingCarouselSelectorIDs.APP_START_TIME_ID);
    }
  }

  async isGetLaunchDurationDisplayed() {
    const element = await this.getLaunchDuration();
    await expect(element).toBeDisplayed();
  }

  async waitForSplashAnimationToDisplay() {
    const elem = await this.splashScreenMetamaskAnimationId;
    const getStartedElem = await this.getStartedButton;
    try {
      await elem.waitForExist();
    } catch (error) {
      console.log(
        `Splash screen animation element '${this.splashScreenMetamaskAnimationId}' not found`,
      );
      await getStartedElem.waitForExist();
    }
  }

  async waitForSplashAnimationToComplete() {
    const elem = await this.splashScreenMetamaskAnimationId;
    await elem.waitForExist();
    await elem.waitForExist({ reverse: true });
  }

  async isScreenDisplayed() {
    if (!this._device) {
      expect(this.screen).toBeDisplayed();
    } else {
      const element = await this.screen;
      await appwrightExpect(element).toBeVisible();
    }
  }

  async isGetStartedButtonDisplayed() {
    if (!this._device) {
      expect(this.getStartedButton).toBeDisplayed();
    } else {
      const element = await this.getStartedButton;
      await appwrightExpect(element).toBeVisible();
    }
  }

  async waitForSplashAnimationToNotExit() {
    const elem = await this.splashScreenMetamaskAnimationId;
    await elem.waitForExist({ reverse: true });
  }

  async verifyCarouselTitle(key) {
    const elem = Selectors.getElementByPlatform(
      WELCOME_SCREEN_CAROUSEL_TITLE_ID(key),
      true,
    );
    await expect(elem).toBeDisplayed();
  }

  async swipeNextSlide() {
    const carouselRectangles = await this.getCarouselRect();
    const y = Math.round(carouselRectangles.y + carouselRectangles.height / 2);
    await Gestures.swipe(
      {
        x: Math.round(
          carouselRectangles.width - carouselRectangles.width * 0.1,
        ),
        y,
      },
      {
        x: Math.round(carouselRectangles.x + carouselRectangles.width * 0.1),
        y,
      },
    );
  }

  async getCarouselRect() {
    // Get the rectangles of the carousel and store it in a global that will be used for a next call.
    // We dont want ask for the rectangles of the carousel if we already know them.
    // This will save unneeded webdriver calls.
    const element = await this.screen;
    this.CAROUSEL_RECTANGLES =
      this.CAROUSEL_RECTANGLES ||
      (await driver.getElementRect(element.elementId));

    return this.CAROUSEL_RECTANGLES;
  }

  async clickGetStartedButton() {
    if (!this._device) {
      const element = await this.screen;
      let screenExist = await element.isExisting();

      await Gestures.waitAndTap(this.getStartedButton);
      await driver.pause(7000);
      screenExist = await element.isExisting();
    } else {
      const button = await AppwrightSelectors.getElementByID(this._device, OnboardingCarouselSelectorIDs.GET_STARTED_BUTTON_ID);
      await button.tap();
    }
  }

  async waitForScreenToDisplay() {
    if (!this._device) {
      const element = await this.screen;
      await element.waitForDisplayed({ interval: 500 });
    } else {
      const element = await this.screen;
      await appwrightExpect(element).toBeVisible();
    }
  }
}

export default new WelcomeScreen();
