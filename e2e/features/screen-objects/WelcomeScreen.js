import { ONBOARDING_CAROUSEL_CONTAINER_ID } from '../../../app/constants/testIDs/WelcomeScreen.constants';
import { CAROUSEL_TITLE_ID, METAMASK_ANIMATION_ID } from '../../../app/constants/testIDs/WelcomeScreen.constants';
import Gestures from '../helpers/Gestures';

class WelcomeScreen  {
  CAROUSEL_RECTANGLES = null;

  async verifySplashScreen() {
    const elem = await $(`~${METAMASK_ANIMATION_ID}`)
    await expect(elem).toBeDisplayed();
    await elem.waitForDisplayed({ reverse: true });
  }

  async verifyCarouselOneTitle() {
    await expect(await $(`~${CAROUSEL_TITLE_ID('one')}`)).toBeDisplayed();
  }

  async verifyCarouselTwoTitle() {
    await expect(await $(`~${CAROUSEL_TITLE_ID('two')}`)).toBeDisplayed();
  }

  async verifyCarouselThreeTitle() {
    await expect(await $(`~${CAROUSEL_TITLE_ID('three')}`)).toBeDisplayed();
  }

  async swipeNextSlide() {
    const carouselRectangles = await this.getCarouselRect()
    const y = Math.round(carouselRectangles.y + (carouselRectangles.height / 2));
    await Gestures.swipe(
      { x: Math.round(carouselRectangles.width - (carouselRectangles.width * 0.10)), y },
      { x: Math.round(carouselRectangles.x + (carouselRectangles.width * 0.10)), y },
    );
  }

   async getCarouselRect() {
    // Get the rectangles of the carousel and store it in a global that will be used for a next call.
    // We dont want ask for the rectangles of the carousel if we already know them.
    // This will save unneeded webdriver calls.
    this.CAROUSEL_RECTANGLES = this.CAROUSEL_RECTANGLES || await driver.getElementRect(await $(`~${ONBOARDING_CAROUSEL_CONTAINER_ID}`).elementId);

    return this.CAROUSEL_RECTANGLES;
  }
}

export default new WelcomeScreen();
