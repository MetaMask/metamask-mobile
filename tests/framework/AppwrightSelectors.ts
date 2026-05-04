import { AppwrightLocator, Device, Platform } from 'appwright';

export default class AppwrightSelectors {
  /**
   * @deprecated Use PlaywrightSelectors.getById() instead
   * @param testDevice - The device object
   * @param id - The ID of the element
   * @param exact - Whether to match exactly
   */
  static async getElementByID(
    testDevice: Device,
    id: string,
    exact: boolean = true,
  ): Promise<AppwrightLocator> {
    return await testDevice.getById(id, { exact });
  }

  /**
   * @deprecated Use PlaywrightSelectors.getByXpath() instead
   * @param testDevice - The device object
   * @param xpath - The XPath of the element
   */
  static async getElementByXpath(
    testDevice: Device,
    xpath: string,
  ): Promise<AppwrightLocator> {
    return await testDevice.getByXpath(xpath);
  }

  /**
   * @deprecated Use PlaywrightSelectors.getByText() instead
   * @param testDevice - The device object
   * @param text - The text of the element
   * @param exact - Whether to match exactly
   */
  static async getElementByText(
    testDevice: Device,
    text: string,
    exact: boolean = false,
  ): Promise<AppwrightLocator> {
    return await testDevice.getByText(text, { exact });
  }

  // Catch-all xpath selector that works on both platforms
  /**
   * @deprecated Use PlaywrightSelectors.getByCatchAll() instead
   * @param testDevice - The device object
   * @param identifier - The identifier of the element
   */
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

  /**
   * @deprecated Use PlaywrightSelectors.getByNameiOS() instead
   * @param testDevice - The device object
   * @param identifier - The identifier of the element
   */
  static async getElementByNameiOS(
    testDevice: Device,
    identifier: string,
  ): Promise<AppwrightLocator | null> {
    const isIOS = AppwrightSelectors.isIOS(testDevice);
    if (isIOS) {
      const xpath = `//*[@name='${identifier}']`;
      return await AppwrightSelectors.getElementByXpath(testDevice, xpath);
    }
    return null;
  }

  /**
   * @deprecated Use PlaywrightSelectors.isIOS() instead
   * @param testDevice - The device object
   */
  static isIOS(testDevice: Device): boolean {
    const platform = testDevice.getPlatform();
    return platform === Platform.IOS;
  }

  /**
   * @deprecated Use PlaywrightSelectors.isAndroid() instead
   * @param testDevice - The device object
   */
  static isAndroid(testDevice: Device): boolean {
    const platform = testDevice.getPlatform();
    return platform === Platform.ANDROID;
  }

  /**
   * @deprecated Use PlaywrightSelectors.waitForElementToDisappear() instead
   * @param element - The element
   * @param elementName - The name of the element
   * @param timeout - The timeout in milliseconds
   */
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
