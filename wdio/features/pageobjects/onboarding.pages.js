import wdio from 'webdriverio'
import assert from 'assert'


export default class OnboardingPages {
    constructor(){
        this.ONBOARDING_CAROUSEL = $('#onboarding-carousel-screen');
        this.GET_STARTED_BUTTON_ID = $('onboarding-get-started-button');


    }
    // get GET_STARTED_BUTTON() { return $('#onboarding-get-started-button'); }

    async verifyWelcomeScreen() {
        // console.log(`Welcome screen test is ${GET_STARTED_BUTTON.getText()}`);
        // (await this.ONBOARDING_CAROUSEL).isDisplayed();
        assert (await this.ONBOARDING_CAROUSEL).waitForExist();
        // console.log(`Welcome screen test is ${(await this.GET_STARTED_BUTTON).getText()}`);
    }

    async tapGetStartedButton(){
        await this.GET_STARTED_BUTTON_ID.click();
    }
}