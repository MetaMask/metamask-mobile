import {
  asPlaywrightElement,
  encapsulated,
  encapsulatedAction,
  EncapsulatedElementType,
  PlaywrightGestures,
  PlaywrightMatchers,
} from '../../framework';

class ChromeBrowserView {
  get chromeHomePageSearchBox(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById(
          'com.android.chrome:id/search_box_text',
        ),
    });
  }

  get chromeUrlBar(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById('com.android.chrome:id/url_bar'),
    });
  }

  get onboardingChromeWithoutAccount(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById(
          'com.android.chrome:id/signin_fre_dismiss_button',
        ),
    });
  }

  get chromeNoThanksButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById(
          'com.android.chrome:id/no_thanks_button',
        ),
    });
  }

  get chromeMenuButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById('com.android.chrome:id/menu_button'),
    });
  }

  get chromeRefreshButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById('com.android.chrome:id/button_five'),
    });
  }

  get chromeUrlEntry(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById('com.android.chrome:id/line_2'),
    });
  }

  async tapSelectDappUrl() {
    await encapsulatedAction({
      appium: async () => {
        await PlaywrightGestures.tap(
          await asPlaywrightElement(this.chromeUrlEntry),
        );
      },
    });
  }

  async tapSearchBox() {
    await encapsulatedAction({
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.chromeHomePageSearchBox),
        );
      },
    });
  }

  async tapUrlBar() {
    await encapsulatedAction({
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.chromeUrlBar),
        );
      },
    });
  }

  async tapOnboardingChromeWithoutAccount() {
    await encapsulatedAction({
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.onboardingChromeWithoutAccount),
        );
      },
    });
  }

  async tapChromeNoThanksButton() {
    await encapsulatedAction({
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.chromeNoThanksButton),
        );
      },
    });
  }

  async tapChromeMenuButton() {
    await encapsulatedAction({
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.chromeMenuButton),
        );
      },
    });
  }

  async tapChromeRefreshButton() {
    await encapsulatedAction({
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.chromeRefreshButton),
        );
      },
    });
  }
}

export default new ChromeBrowserView();
