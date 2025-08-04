export default class AppwrightSelectors {
  static async getElementByResourceId(device, id) {
    console.log(device);
    if (device.webDriverClient.capabilities.platformName === 'Android') {
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
    if (device.webDriverClient.capabilities.platformName === 'Android') {
      return await device.getByXpath(`//*[@text='${text}']`);
    } else {
      return await device.getByXpath(`//*[@name='${text}']`);
    }
  }
}