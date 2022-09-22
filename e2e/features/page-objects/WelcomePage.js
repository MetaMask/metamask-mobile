import Page from './Page';

export const ONBOARDING_CAROUSEL_CONTAINER_ID = 'onboarding-carousel-container';
export const GET_STARTED_BUTTON_ID = 'onboarding-get-started-button';
export const METAMASK_ANIMATION_ID = 'metamask-animation';
export const CAROUSEL_IMAGE_ID = (number) => `carousel-${number}-image`;
export const CAROUSEL_TITLE_ID = (number) => `carousel-${number}-title`;

class WelcomePage extends Page {
  CAROUSEL_RECTANGLES = null;

  static async verifySplashScreen() {
    await expect(await $(`~${METAMASK_ANIMATION_ID}`)).toBeDisplayed();
  }

  static async verifyCarouselOneTitle() {
    await expect(await $(`~${CAROUSEL_TITLE_ID('one')}`)).toBeDisplayed();
  }

  static async verifyCarouselTwoTitle() {
    await expect(await $(`~${CAROUSEL_TITLE_ID('two')}`)).toBeDisplayed();
  }

  static async verifyCarouselThreeTitle() {
    await expect(await $(`~${CAROUSEL_TITLE_ID('three')}`)).toBeDisplayed();
  }

  static async swipeCarouselLeft() {
    // const rect = await this.getCarouselRect()
    // console.log("🚀 ~ file: WelcomePage.js ~ line 30 ~ WelcomePage ~ swipeCarouselLeft ~ rect", rect)
    // await this.improvedSwipe()
  }
}

export default WelcomePage
