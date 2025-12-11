import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';

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
    await AppwrightGestures.tap(this.closePositionButton);
    await AppwrightGestures.tap(this.confirmClosePositionButton);
  }

  async isPositionOpen() {
    const closePositionButton = await this.closePositionButton;
    return await closePositionButton.isVisible();
  }

  async closePositionWithRetry() {
    let isClosed = false;
    for (let i = 0; i < 5; i++) {
      if (!(await this.isPositionOpen())) {
        isClosed = true;
        break;
      }

      try {
        await this.tapClosePositionButton();
        await this.device.waitForTimeout(3000);
        console.log(`Retry closing position attempt ${i + 1} successful`);

        if (!(await this.isPositionOpen())) {
          isClosed = true;
          break;
        }
      } catch (error) {
        console.log(`Retry closing position attempt ${i + 1} failed:`, error);
      }
    }

    if (!isClosed) {
      throw new Error('Failed to close position');
    }
  }  
}

export default new PerpsPositionDetailsView();


