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
    const isAndroid = await AppwrightSelectors.isAndroid(device);
    
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
  static async isIOS(device) {
    return device.webDriverClient.capabilities.platformName === 'iOS';
  }

  static async isAndroid(device) {
    return device.webDriverClient.capabilities.platformName === 'android' || await device.webDriverClient.capabilities.platformName === 'Android';
  }
}