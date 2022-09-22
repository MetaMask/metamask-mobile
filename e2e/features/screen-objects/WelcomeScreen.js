import Gestures from '../helpers/Gestures';

export const ONBOARDING_CAROUSEL_CONTAINER_ID = 'onboarding-carousel-container';
export const GET_STARTED_BUTTON_ID = 'onboarding-get-started-button';
export const METAMASK_ANIMATION_ID = 'metamask-animation';
export const CAROUSEL_IMAGE_ID = (number) => `carousel-${number}-image`;
export const CAROUSEL_TITLE_ID = (number) => `carousel-${number}-title`;

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

  async swipeCarouselLeft() {
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
