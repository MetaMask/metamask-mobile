export default class AppwrightSelectors {
  
  // The below three selectors are the primary selectors
  static async getElementByID(device, id, timeout = 10000) {
    return await device.getById(id,{ exact: true, timeout });
  }

  static async getElementByXpath(device, xpath, timeout = 10000) {
    return await device.getByXpath(xpath, { timeout });
  }

  static async getElementByText(device, text, timeout = 10000) {
    return await device.getByText(text, { timeout });
  }

  // This is a catch-all xpath selector that works on both platforms. Needed to identify deeply nested elements
  static async getElementByCatchAll(device, identifier, timeout = 10000) {
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

  static async getElementByContentDesc(device, text, timeout = 10000) {
    const xpath = `//*[contains(@content-desc,'${text}')]`;
    return await AppwrightSelectors.getElementByXpath(device, xpath, timeout);
  }

  static async getElementByNameiOS(device, identifier, timeout = 10000) {
    const isIOS = AppwrightSelectors.isIOS(device);
    if (isIOS) {
      const xpath = `//*[contains(@name,'${identifier}')][1]`;
      return await AppwrightSelectors.getElementByXpath(device, xpath, timeout);
    }
  }

  static isIOS(device) {
    return device.webDriverClient.capabilities.platformName === 'iOS' || device.webDriverClient.capabilities.platformName === 'ios';
  }


  static isAndroid(device) {
    return device.webDriverClient.capabilities.platformName === 'android' || device.webDriverClient.capabilities.platformName === 'Android';
  }

  static async terminateApp(device) {
    let retries = 3;
    const packageId = this.isIOS(device) ? 'io.metamask.MetaMask' : 'io.metamask'; 
    while (retries > 0) {
      try {
        await device.terminateApp(packageId);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        retries--;
      } catch (error) {
        console.log('Error terminating app', packageId);
        console.log('Error terminating app, retrying...', error);
        retries--;
        
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            await device.terminateApp(packageId);
          } catch (retryError) {
            console.log('Retry also failed:', retryError.message);
          }
        }
      }
    }
      // Timeout to ensure the app is terminated
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  static async activateApp(device) {
    const packageId = this.isIOS(device) ? 'io.metamask.MetaMask' : 'io.metamask';
    let retries = 3;
    
    while (retries > 0) {
      try {
        const result = await device.activateApp(packageId);
        console.log(`Successfully activated app: ${packageId}`);
        // Esperar un momento para que la app se inicialice completamente
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return result;
      } catch (error) {
        console.log(`Error activating app ${packageId}, attempt ${4 - retries}`);
        console.log('Error details:', error.message);
        retries--;
        
        if (retries > 0) {
          console.log(`Retrying activation... ${retries} attempts left`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          console.log('All activation attempts failed');
          throw error; // Re-lanzar el último error
        }
      }
    }
  }

  static async hideKeyboard(device) {
    if (AppwrightSelectors.isAndroid(device)) await device.webDriverClient.hideKeyboard(); // only needed for Android
  }


  static async backgroundApp(device, time) {
    const driver = device.webDriverClient;
    await driver.background(time);
  }

  static async scrollToElement(device, element) {
    const maxScrolls = 10; 
    let scrollCount = 0;
    let isVisible = await element.isVisible({ timeout: 500 });
    const driver = device.webDriverClient;
    while (!(isVisible) && scrollCount < maxScrolls) {
        await driver.executeScript("mobile: swipeGesture", [
            {
                left: 100, 
                top: 500,
                width: 200,
                height: 500, 
                direction: "up", 
                percent: 0.60
            }
        ]);
        isVisible = await element.isVisible({ timeout: 500 });
        if (isVisible) {
          console.log('Element found and visible, returning element');
          return element;
        }
        console.log('Element not found or not visible, continuing scrolling');
        scrollCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  static async dismissAlert(device) {
    // Simple wrapper that uses appropriate timeout for platform
    const isIOS = AppwrightSelectors.isIOS(device);
    const timeout = isIOS ? 8000 : 2000; // 8 seconds for iOS, 2 for Android
    await device.waitForTimeout(timeout);
    return await device.webDriverClient.dismissAlert();
  }

  static async scrollIntoView(device, element) {
    for (let i = 0; i < 20; i++) {
      try {
        const isVisible = await element.isVisible({ timeout: 10000 });
        
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