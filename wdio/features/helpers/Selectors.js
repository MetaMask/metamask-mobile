/*  global $, driver */
class Selectors {
  static async getElementByPlatform(id, isNested = false) {
    if (!isNested) {
      return $(`~${id}`);
    }

    const platform = await driver.getPlatform();
    if (platform === 'Android') {
      return $(`~${id}`);
    } else if (platform === 'iOS') {
      /**
       * Use class chains for iOS
       * Ref.: https://webdriver.io/docs/selectors#ios-uiautomation
       * Too many levels of nesting cause test ids not to be rendered
       * Ref.: https://github.com/appium/appium/issues/14825
       */
      return $(`-ios class chain:${id}`);
    }
  }
}

export default Selectors;
