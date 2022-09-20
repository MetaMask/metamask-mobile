// import wdio from 'webdriverio';
import assert from 'assert';

// const GET_STARTED_BUTTON = $('#onboarding-get-started-button');
// const ONBOARDING_CAROUSEL = $('#onboarding-carousel-screen');

class OnboardingPages {
  get ONBOARDING_CAROUSEL() {
    return $('#onboarding-carousel-screen');
  }
  // get GET_STARTED_BUTTON() { return $('#onboarding-get-started-button'); }

  async verifyWelcomeScreen() {
    // console.log(`Welcome screen test is ${GET_STARTED_BUTTON.getText()}`);
    // (await this.ONBOARDING_CAROUSEL).isDisplayed();
    assert(await this.ONBOARDING_CAROUSEL).waitForExist();
    // console.log(`Welcome screen test is ${(await this.GET_STARTED_BUTTON).getText()}`);
  }
}

export default new OnboardingPages();
