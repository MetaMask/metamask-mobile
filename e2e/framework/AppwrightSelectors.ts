import { AppwrightLocator, Device, Platform } from 'appwright';

export default class AppwrightSelectors {
  static async getElementByID(
    testDevice: Device,
    id: string,
  ): Promise<AppwrightLocator> {
    return await testDevice.getById(id, { exact: true });
  }

  static async getElementByXpath(
    testDevice: Device,
    xpath: string,
  ): Promise<AppwrightLocator> {
    return await testDevice.getByXpath(xpath);
  }

  static async getElementByText(
    testDevice: Device,
    text: string,
  ): Promise<AppwrightLocator> {
    return await testDevice.getByText(text);
  }

  static async getElementByTextContains(
    testDevice: Device,
    text: string,
  ): Promise<AppwrightLocator> {
    const isAndroid = AppwrightSelectors.isAndroid(testDevice);

    if (isAndroid) {
      // Android: text or content-desc contains
      const xpath = `//*[contains(@text,'${text}') or contains(@content-desc,'${text}')]`;
      return await AppwrightSelectors.getElementByXpath(testDevice, xpath);
    }

    // iOS: name, label, or value contains
    const xpath = `//*[contains(@name,'${text}') or contains(@label,'${text}') or contains(@value,'${text}')]`;
    return await AppwrightSelectors.getElementByXpath(testDevice, xpath);
  }

  // Catch-all xpath selector that works on both platforms
  static async getElementByCatchAll(
    testDevice: Device,
    identifier: string,
  ): Promise<AppwrightLocator> {
    const isAndroid = AppwrightSelectors.isAndroid(testDevice);

    if (isAndroid) {
      // Android: resource-id, text, content-desc
      const xpath = `//*[@resource-id='${identifier}' or contains(@text,'${identifier}') or contains(@content-desc,'${identifier}')]`;
      return await AppwrightSelectors.getElementByXpath(testDevice, xpath);
    }

    // iOS: name, label, text
    const xpath = `//*[contains(@name,'${identifier}') or contains(@label,'${identifier}') or contains(@text,'${identifier}')]`;
    return await AppwrightSelectors.getElementByXpath(testDevice, xpath);
  }

  static async getElementByNameiOS(
    testDevice: Device,
    identifier: string,
  ): Promise<AppwrightLocator | null> {
    const isIOS = AppwrightSelectors.isIOS(testDevice);
    if (isIOS) {
      const xpath = `//*[contains(@name,'${identifier}')]`;
      return await AppwrightSelectors.getElementByXpath(testDevice, xpath);
    }
    return null;
  }

  static isIOS(testDevice: Device): boolean {
    const platform = testDevice.getPlatform();
    return platform === Platform.IOS;
  }

  static isAndroid(testDevice: Device): boolean {
    const platform = testDevice.getPlatform();
    return platform === Platform.ANDROID;
  }
}
