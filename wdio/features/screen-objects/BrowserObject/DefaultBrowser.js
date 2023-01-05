/* global driver */
class DefaultBrowser {
  async isDeviceDefaultBrowserDisplay() {
    await expect(driver.getCurrentActivity()).equal(
      'com.google.android.apps.chrome.Main',
    );
  }

  async isDeviceDefaultBrowserUrl(url) {
    await expect(driver.getUrl()).toContain(url);
  }
}

export default new DefaultBrowser();
