import { type AppiumElement, Gestures, Matchers } from '../../framework';

class ChromeBrowserView {
  get chromeHomePageSearchBox(): Promise<AppiumElement> {
    return Matchers.getElementByID('com.android.chrome:id/search_box_text');
  }

  get chromeUrlBar(): Promise<AppiumElement> {
    return Matchers.getElementByID('com.android.chrome:id/url_bar');
  }

  get onboardingChromeWithoutAccount(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      'com.android.chrome:id/signin_fre_dismiss_button',
    );
  }

  get chromeNoThanksButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('com.android.chrome:id/no_thanks_button');
  }

  get chromeMenuButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('com.android.chrome:id/menu_button');
  }

  get chromeRefreshButton(): Promise<AppiumElement> {
    return Matchers.getElementByID('com.android.chrome:id/button_five');
  }

  get chromeUrlEntry(): Promise<AppiumElement> {
    return Matchers.getElementByID('com.android.chrome:id/line_2');
  }

  async tapSelectDappUrl() {
    await Gestures.tap(this.chromeUrlEntry, {
      elemDescription: 'Chrome URL entry',
    });
  }

  async tapSearchBox() {
    await Gestures.waitAndTap(this.chromeHomePageSearchBox, {
      elemDescription: 'Chrome home page search box',
    });
  }

  async tapUrlBar() {
    await Gestures.waitAndTap(this.chromeUrlBar, {
      elemDescription: 'Chrome URL bar',
    });
  }

  async tapOnboardingChromeWithoutAccount() {
    await Gestures.waitAndTap(this.onboardingChromeWithoutAccount, {
      elemDescription: 'Chrome onboarding dismiss button',
    });
  }

  async tapChromeNoThanksButton() {
    await Gestures.waitAndTap(this.chromeNoThanksButton, {
      elemDescription: 'Chrome No Thanks button',
    });
  }

  async tapChromeMenuButton() {
    await Gestures.waitAndTap(this.chromeMenuButton, {
      elemDescription: 'Chrome menu button',
    });
  }

  async tapChromeRefreshButton() {
    await Gestures.waitAndTap(this.chromeRefreshButton, {
      elemDescription: 'Chrome refresh button',
    });
  }
}

export default new ChromeBrowserView();
