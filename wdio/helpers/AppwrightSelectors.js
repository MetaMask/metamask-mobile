export default class AppwrightSelectors {
  static async getElementByResourceId(device, id) {
    if (device.webDriverClient.capabilities.platformName === 'android') {
      return await device.getByXpath(`//*[@resource-id='${id}']`);
    } else {
      return await device.getById(id);
    }
  }

  static async getElementByXpath(device, xpath) {
    return await device.getByXpath(xpath);
  }

  static async getElementByXpathByContentDesc(device, contentDesc) {
      return await device.getByXpath(`//*[@content-desc='${contentDesc}']`);
  }

  static async getElementByText(device, text) {
    const isAndroid = await AppwrightSelectors.isAndroid(device);
    if (isAndroid) {
      return await device.getByXpath(`//*[@text='${text}']`);
    } else {
      return await device.getByXpath(`//*[@name='${text}']`);
    }
  }

  static async isIOS(device) {
    return device.webDriverClient.capabilities.platformName === 'iOS';
  }

  static async isAndroid(device) {
    return device.webDriverClient.capabilities.platformName === 'android';
  }
}