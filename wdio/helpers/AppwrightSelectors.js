export default class AppwrightSelectors {
  
  // The below three selectors are the primary selectors
  static async getElementByID(device, id) {
    return await device.getById(id,{ exact: true });
  }

  static async getElementByXpath(device, xpath) {
    return await device.getByXpath(xpath);
  }

  static async getElementByText(device, text) {
    return await device.getByText(text);
  }

  // This is a catch-all xpath selector that works on both platforms. Needed to identify deeply nested elements
  static async getElementByCatchAll(device, identifier) {
    const isAndroid = AppwrightSelectors.isAndroid(device);
    
    if (isAndroid) {
      // Android: resource-id, text, content-desc (exact match for resource-id, contains for text/desc)
      const xpath = `//*[@resource-id='${identifier}' or contains(@text,'${identifier}') or contains(@content-desc,'${identifier}')]`;
      return await AppwrightSelectors.getElementByXpath(device, xpath);
    } else {
      // iOS: name, label, text (contains for all to handle partial matches)
      const xpath = `//*[contains(@name,'${identifier}') or contains(@label,'${identifier}') or contains(@text,'${identifier}')]`;
      return await AppwrightSelectors.getElementByXpath(device, xpath);
    }
  }

  static async getElementByNameiOS(device, identifier) {
    const isIOS = AppwrightSelectors.isIOS(device);
    if (isIOS) {
      const xpath = `//*[contains(@name,'${identifier}')][1]`;
      return await AppwrightSelectors.getElementByXpath(device, xpath);
    }
  }

  static isIOS(device) {
    return device.webDriverClient.capabilities.platformName === 'iOS' || device.webDriverClient.capabilities.platformName === 'ios';
  }

  static isAndroid(device) {
    return device.webDriverClient.capabilities.platformName === 'android' || device.webDriverClient.capabilities.platformName === 'Android';
  }

  static async terminateApp(device) {
    return await device.webDriverClient.terminateApp(this.isIOS(device) ? 'io.metamask.MetaMask-QA' : 'io.metamask.qa');
  }

  static async activateApp(device) {
    const packageId = this.isIOS(device) ? 'io.metamask.MetaMask-QA' : 'io.metamask.qa'; 
    return await device.webDriverClient.activateApp(packageId);
  }

  static async hideKeyboard(device) {
    if (AppwrightSelectors.isAndroid(device)) await device.webDriverClient.hideKeyboard(); // only needed for Android
  }

  static async backgroundApp(device, time) {
    const driver = device.webDriverClient;
    await driver.background(time);
  }

  static async scrollDown(device) {
    const driver = device.webDriverClient;
    if (AppwrightSelectors.isAndroid(device)) {
      // For Android, use a swipe gesture
      //await driver.tap({ x: 500, y: 1500 });
      await driver.executeScript("mobile: swipeGesture", [
        {
          left: 100,
          top: 500,
          width: 200,
          height: 500,
          direction: "up",
          percent: 0.25
        }
      ]);
    } else {
      // For iOS, use mobile: scroll command
      await driver.executeScript("mobile: scroll", [
        {
          direction: "down",
          percent: 0.25
        }
      ]);
    }
  }

  static async scrollIntoView(device, element) {
    for (let i = 0; i < 20; i++) {
      try {
        const isVisible = await element.isVisible({ timeout: 2000 });
        
        if (isVisible) {
          console.log('Element found and visible, returning element');
          return element;
        }
      } catch (error) {
        // Element not found or not visible, continue scrolling
        console.log('Element not found or not visible, continuing scrolling');
      }
      const driver = device.webDriverClient;
      // Perform a scroll action
      if (AppwrightSelectors.isAndroid(device)) {
        // For Android, use a swipe gesture
        //await driver.tap({ x: 500, y: 1500 });
        await driver.executeScript("mobile: swipeGesture", [
          {
            left: 100,
            top: 500,
            width: 200,
            height: 1000,
            direction: "up",
            percent: 0.75
          }
        ]);
      } else {
        // For iOS, use mobile: scroll command
        await driver.executeScript("mobile: scroll", [
          {
            direction: "down",
            percent: 0.75
          }
        ]);
      }
      
      // Wait a bit for the scroll to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Element not found after 5 scroll attempts`);
  
  }
}