import Selectors from '../../wdio/helpers/Selectors';
import { OnboardingCarouselSelectorIDs } from '../../e2e/selectors/Onboarding/OnboardingCarousel.selectors';
import { expect } from 'appwright';

export class CommonScreen {
  constructor(device) {
    this.device = device;
    this.platform = this.device.webDriverClient.capabilities.platformName;
  }

  async isIOS() {
    return this.platform === 'iOS';
  }

  async tapOnElement(id) {
    (await this.isIOS())
      ? await this.device.getById(id).tap()
      : await this.device.getByXpath(`//*[@resource-id='${id}']`).tap();
  }

  async tapOnElementByText(text) {
    (await this.isIOS())
      ? await this.device.getByXpath(`//*[@name='${text}']`).tap()
      : await this.device.getByXpath(`//*[@text='${text}']`).tap();
  }

  async fillInput(inputId, value) {
    (await this.isIOS())
      ? await this.device.getById(inputId).fill(value)
      : await this.device
          .getByXpath(`//*[@resource-id='${inputId}']`)
          .fill(value);
  }

  async isElementByIdVisible(element) {
    (await this.isIOS())
      ? await expect(this.device.getById(element)).toBeVisible()
      : await expect(
          this.device.getByXpath(`//*[@resource-id='${element}']`),
        ).toBeVisible();
  }

  async getText(element) {
    return this.isIOS()
      ? await this.device.getById(element).getText()
      : await this.device
          .getByXpath(`//*[@resource-id='${element}']`)
          .getText();
  }
}
