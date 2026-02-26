import { RampsOrderDetailsSelectorsIDs } from '../../../app/components/UI/Ramp/Views/OrderDetails/OrderDetails.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';

class OrderDetailsView {
  get container(): DetoxElement {
    return Matchers.getElementByID(RampsOrderDetailsSelectorsIDs.CONTAINER);
  }

  get closeButton(): DetoxElement {
    return Matchers.getElementByID(RampsOrderDetailsSelectorsIDs.CLOSE_BUTTON);
  }

  get tokenAmount(): DetoxElement {
    return Matchers.getElementByID(RampsOrderDetailsSelectorsIDs.TOKEN_AMOUNT);
  }
  get backButton(): DetoxElement {
    return Matchers.getElementByID('ramps-order-details-back-navbar-button'); // this is temporary
  }

  async tapCloseButton(): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.closeButton);
    await Gestures.waitAndTap(this.closeButton, {
      timeout: 2500,
      elemDescription: 'Ramps Order Details Close Button',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Ramps Order Details Back Button',
    });
  }
}

export default new OrderDetailsView();
