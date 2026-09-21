import { PerpsOrderDetailsViewSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { type AppiumElement } from '../../framework';

class PerpsOrderDetailsView {
  get cancelOrderButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsOrderDetailsViewSelectorsIDs.CANCEL_BUTTON,
    );
  }

  async tapCancelOrderButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelOrderButton, {
      elemDescription: 'Cancel order button on order details',
      timeout: 15000,
    });
  }
}

export default new PerpsOrderDetailsView();
