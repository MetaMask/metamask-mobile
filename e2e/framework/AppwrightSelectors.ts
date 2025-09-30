export interface Device {
  getById(id: string, options?: { exact?: boolean }): Promise<unknown>;
  getByXpath(xpath: string): Promise<unknown>;
  getByText(text: string): Promise<unknown>;
  webDriverClient: {
    capabilities: {
      platformName: string;
    };
  };
}

export default class AppwrightSelectors {
  // The below three selectors are the primary selectors
  static async getElementByID(
    testDevice: Device,
    id: string,
  ): Promise<unknown> {
    return await testDevice.getById(id, { exact: true });
  }

  static async getElementByXpath(
    testDevice: Device,
    xpath: string,
  ): Promise<unknown> {
    return await testDevice.getByXpath(xpath);
  }

  static async getElementByText(
    testDevice: Device,
    text: string,
  ): Promise<unknown> {
    return await testDevice.getByText(text);
  }

  // Catch-all xpath selector that works on both platforms
  static async getElementByCatchAll(
    testDevice: Device,
    identifier: string,
  ): Promise<unknown> {
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
  ): Promise<unknown> {
    const isIOS = AppwrightSelectors.isIOS(testDevice);
    if (isIOS) {
      const xpath = `//*[contains(@name,'${identifier}')][1]`;
      return await AppwrightSelectors.getElementByXpath(testDevice, xpath);
    }
    return null;
  }

  static isIOS(testDevice: Device): boolean {
    const platform = testDevice.webDriverClient.capabilities.platformName;
    return platform === 'iOS' || platform === 'ios';
  }

  static isAndroid(testDevice: Device): boolean {
    const platform = testDevice.webDriverClient.capabilities.platformName;
    return platform === 'android' || platform === 'Android';
  }
}
