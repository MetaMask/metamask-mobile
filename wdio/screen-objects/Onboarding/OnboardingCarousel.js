import {
  WELCOME_SCREEN_CAROUSEL_CONTAINER_ID,
  WELCOME_SCREEN_CAROUSEL_TITLE_ID,
} from '../testIDs/Screens/WelcomeScreen.testIds';
import { SPLASH_SCREEN_METAMASK_ANIMATION_ID } from '../testIDs/Components/MetaMaskAnimation.testIds';
import { OnboardingCarouselSelectorIDs } from '../../../e2e/selectors/Onboarding/OnboardingCarousel.selectors'
import Gestures from '../../helpers/Gestures';
import Selectors from '../../helpers/Selectors';

class WelcomeScreen {
  constructor() {
    this.CAROUSEL_RECTANGLES = null;
  }

  get splashScreenMetamaskAnimationId() {
    return Selectors.getXpathElementByResourceId(
      SPLASH_SCREEN_METAMASK_ANIMATION_ID,
    );
  }

  get getStartedButton() {
    return Selectors.getXpathElementByResourceId(
      'welcome-screen-get-started-button-id',
    );
  }

  get screen() {
    return Selectors.getXpathElementByResourceId(
      WELCOME_SCREEN_CAROUSEL_CONTAINER_ID,
    );
  }

  async getLaunchDuration() {
    return await Selectors.getXpathElementByResourceId(
      OnboardingCarouselSelectorIDs.APP_START_TIME_ID,
    );
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
    expect(this.screen).toBeDisplayed();
  }

  async isGetStartedButtonDisplayed() {
    expect(this.getStartedButton).toBeDisplayed();
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
    const element = await this.screen;
    let screenExist = await element.isExisting();

    while (screenExist) {
      await Gestures.waitAndTap(this.getStartedButton);
      await driver.pause(7000);
      screenExist = await element.isExisting();
    }
  }

  async waitForScreenToDisplay() {
    const element = await this.screen;
    await element.waitForDisplayed({ interval: 500 });
  }
}

export default new WelcomeScreen();
