import { PerpsDepositProcessingViewSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class PerpsDepositProcessingView {
  get headerTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PerpsDepositProcessingViewSelectorsIDs.HEADER_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsDepositProcessingViewSelectorsIDs.HEADER_TITLE,
        ),
    });
  }

  get statusTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PerpsDepositProcessingViewSelectorsIDs.STATUS_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsDepositProcessingViewSelectorsIDs.STATUS_TITLE,
        ),
    });
  }

  get statusDescription(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PerpsDepositProcessingViewSelectorsIDs.STATUS_DESCRIPTION,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsDepositProcessingViewSelectorsIDs.STATUS_DESCRIPTION,
        ),
    });
  }

  get viewBalanceButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          PerpsDepositProcessingViewSelectorsIDs.VIEW_BALANCE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsDepositProcessingViewSelectorsIDs.VIEW_BALANCE_BUTTON,
        ),
    });
  }

  async expectProcessingVisible(): Promise<void> {
    await Assertions.expectTextDisplayed('Deposit in progress', {
      description: 'Deposit in progress text is visible',
      timeout: 15000,
    });
  }

  async tapViewBalance(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.viewBalanceButton, {
      elemDescription: 'Tap View balance after deposit',
    });
  }
}

export default new PerpsDepositProcessingView();
