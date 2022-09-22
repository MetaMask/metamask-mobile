import Page from './Page';

export const ONBOARDING_CAROUSEL_CONTAINER_ID = 'onboarding-carousel-screen';
export const GET_STARTED_BUTTON_ID = 'onboarding-get-started-button';

export const CAROUSEL_IMAGE_ID = (number) => `carousel-${number}-image`;
export const CAROUSEL_TITLE_ID = (number) => `carousel-${number}-title`;

class WelcomePage extends Page {
  static async verifyCarouselOneTitle(title) {
    console.log("🚀 ~ file: WelcomePage.js ~ line 11 ~ WelcomePage ~ verifyCarouselOneTitle ~ title", title)
    await expect(await $(`~${CAROUSEL_TITLE_ID('one')}`)).toBeDisplayed();
    // await expect(await $(`~${CAROUSEL_TITLE_ID('one')}`)).toHaveTextContaining(title);
  }

  static async verifyCarouselTwoTitle() {
    await expect(await this.carouselTwoTitle()).toBeDisplayed();
  }

  static async verifyCarouselThreeTitle() {
    await expect(await this.carouseThreeTitle()).toBeDisplayed();
  }

  static async swipeCarouselRight() {
    await this.swipeRight()
  }
}

export default WelcomePage
