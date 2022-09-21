// import wdio from 'webdriverio';
import { GET_STARTED_BUTTON_ID, WALLET_SETUP_SCREEN_CONTAINER_ID } from '../test-ids';

class OnboardingPages {
  // get ONBOARDING_CAROUSEL() {
  //   return $('#onboarding-carousel-screen');
  // }
  get GET_STARTED_BUTTON() { return $(`~${GET_STARTED_BUTTON_ID}`); }

  async verifyWelcomeScreen() {
    // console.log(`Welcome screen test is ${GET_STARTED_BUTTON.getText()}`);
    // (await this.ONBOARDING_CAROUSEL).isDisplayed();
    await expect(await this.GET_STARTED_BUTTON).toBeDisplayed();
    await this.GET_STARTED_BUTTON.click();
    await expect(await $(`~${WALLET_SETUP_SCREEN_CONTAINER_ID}`)).toBeDisplayed();

    // console.log(`Welcome screen test is ${(await this.GET_STARTED_BUTTON).getText()}`);
  }
}

export default new OnboardingPages();
