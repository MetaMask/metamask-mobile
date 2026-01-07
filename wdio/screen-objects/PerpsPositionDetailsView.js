import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import Utilities from '../../e2e/framework/Utilities';

class PerpsPositionDetailsView {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get closePositionButton() {
     return AppwrightSelectors.getElementByID(this._device, 'perps-market-details-close-button');
  }

  get positionOpenButton() {
    return AppwrightSelectors.getElementByID(this._device, 'position-open-button');
  }

  get confirmClosePositionButton() {
    return AppwrightSelectors.getElementByID(this._device, 'close-position-confirm-button');
  }

  async tapClosePositionButton() {
    await AppwrightGestures.tap(await this.closePositionButton);
    await AppwrightGestures.tap(await this.confirmClosePositionButton);
  }

  async isPositionOpen() {
    const closePositionButton = await this.closePositionButton;
    return await closePositionButton.isVisible();
  }

  async closePositionWithRetry() {
    await Utilities.executeWithRetry(async () => {
      if (await this.isPositionOpen()) {
        await this.tapClosePositionButton();
        const closePositionButton = await this.closePositionButton;
        await AppwrightSelectors.waitForElementToDisappear(
          closePositionButton,
          'Close Position Button',
          5000,
        );
      }
    }, {
      description: 'close position',
      elemDescription: 'Close Position Button',
    });
  }  
}

export default new PerpsPositionDetailsView();


