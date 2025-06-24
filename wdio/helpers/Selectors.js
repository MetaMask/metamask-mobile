class Selectors {
  static async getElementByPlatform(id, isNested = false) {
    if (!isNested) {
      return $(`~${id}`);
    }

    let platform;
    // Check if driver.getPlatform method exists
    if (typeof driver.getPlatform === 'function') {
      platform = await driver.getPlatform();
    } else {
      // Fallback: try to get platform from session
      try {
        const session = await browser.getSession();
        platform = session.platformName;
      } catch (error) {
        // If that fails, assume Android for BrowserStack tests
        platform = 'Android';
      }
    }
    
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

  static async getXpathByContentDesc(id) {
    return driver.$$(`//*[@content-desc='${id}']`);
  }

  static async getXpathElementByText(text) {
    let platform;
    if (typeof driver.getPlatform === 'function') {
      platform = await driver.getPlatform();
    } else {
      try {
        const session = await browser.getSession();
        platform = session.platformName;
      } catch (error) {
        platform = 'Android';
      }
    }
    
    if (platform === 'iOS') {
      return await $(`//*[@name='${text}']`);
    }

    if (platform === 'Android') {
      return await $(`//*[@text='${text}']`);
    }
  }

  static async getXpathElementByTextContains(text) {
    let platform;
    if (typeof driver.getPlatform === 'function') {
      platform = await driver.getPlatform();
    } else {
      try {
        const session = await browser.getSession();
        platform = session.platformName;
      } catch (error) {
        platform = 'Android';
      }
    }
    
    if (platform === 'iOS') {
      return await $(`//*[contains(@name, '${text}')]`);
    }

    if (platform === 'Android') {
      return await $(`//*[contains(@text, '${text}')]`);
    }
  }

  static async getXpathElementByResourceId(id) {
    let platform;
    if (typeof driver.getPlatform === 'function') {
      platform = await driver.getPlatform();
    } else {
      try {
        const session = await browser.getSession();
        platform = session.platformName;
      } catch (error) {
        platform = 'Android';
      }
    }
    
    if (platform === 'iOS') {
      return await $(`~${id}`);
    }

    if (platform === 'Android') {
      return await $(`//*[@resource-id='${id}']`);
    }
  }

  static async getElementByCss(css) {
    return await $(css);
  }
}

export default Selectors;
