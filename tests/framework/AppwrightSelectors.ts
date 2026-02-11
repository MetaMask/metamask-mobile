import { AppwrightLocator, Device, Platform } from 'appwright';

export default class AppwrightSelectors {
  static async getElementByID(
    testDevice: Device,
    id: string,
    exact: boolean = false,
  ): Promise<AppwrightLocator> {
    return await testDevice.getById(id, { exact });
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
    exact: boolean = false,
  ): Promise<AppwrightLocator> {
    return await testDevice.getByText(text, { exact });
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

  static async waitForElementToDisappear(
    element: AppwrightLocator,
    elementName: string,
    timeout = 30000,
  ) {
    const startTime = Date.now();
    const pollInterval = 200;
    while (
      await element.isVisible({ timeout: pollInterval }).catch(() => false)
    ) {
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `${elementName} still visible after ${timeout / 1000} seconds`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}
