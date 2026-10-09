import { PerpsDepositProcessingViewSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';

class PerpsDepositProcessingView {
  get headerTitle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsDepositProcessingViewSelectorsIDs.HEADER_TITLE,
    );
  }

  get statusTitle(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsDepositProcessingViewSelectorsIDs.STATUS_TITLE,
    );
  }

  get statusDescription(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsDepositProcessingViewSelectorsIDs.STATUS_DESCRIPTION,
    );
  }

  get viewBalanceButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsDepositProcessingViewSelectorsIDs.VIEW_BALANCE_BUTTON,
    );
  }

  async expectProcessingVisible(): Promise<void> {
    await Assertions.expectTextDisplayed('Deposit in progress', {
      description: 'Deposit in progress text is visible',
      timeout: 15000,
    });
  }

  async tapViewBalance(): Promise<void> {
    await Gestures.waitAndTap(this.viewBalanceButton, {
      elemDescription: 'Tap View balance after deposit',
    });
  }
}

export default new PerpsDepositProcessingView();
