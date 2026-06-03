import { RampsOrderDetailsSelectorsIDs } from '../../../app/components/UI/Ramp/Views/OrderDetails/OrderDetails.testIds';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class OrderDetailsView {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(RampsOrderDetailsSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RampsOrderDetailsSelectorsIDs.CONTAINER,
        ),
    });
  }

  get closeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(RampsOrderDetailsSelectorsIDs.CLOSE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RampsOrderDetailsSelectorsIDs.CLOSE_BUTTON,
        ),
    });
  }

  get tokenAmount(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(RampsOrderDetailsSelectorsIDs.TOKEN_AMOUNT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RampsOrderDetailsSelectorsIDs.TOKEN_AMOUNT,
        ),
    });
  }
  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(RampsOrderDetailsSelectorsIDs.BACK_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          RampsOrderDetailsSelectorsIDs.BACK_BUTTON,
        ),
    });
  }

  async tapCloseButton(): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.closeButton);
    await UnifiedGestures.waitAndTap(this.closeButton, {
      timeout: 2500,
      elemDescription: 'Ramps Order Details Close Button',
    });
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
      elemDescription: 'Ramps Order Details Back Button',
    });
  }
}

export default new OrderDetailsView();
