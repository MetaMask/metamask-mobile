import { PerpsDepositProcessingViewSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds.ts';
import Matchers from '../../framework/Matchers.ts';
import Assertions from '../../framework/Assertions.ts';
import Gestures from '../../framework/Gestures.ts';

class PerpsDepositProcessingView {
  get headerTitle(): DetoxElement {
    return Matchers.getElementByID(
      PerpsDepositProcessingViewSelectorsIDs.HEADER_TITLE,
    );
  }

  get statusTitle(): DetoxElement {
    return Matchers.getElementByID(
      PerpsDepositProcessingViewSelectorsIDs.STATUS_TITLE,
    );
  }

  get statusDescription(): DetoxElement {
    return Matchers.getElementByID(
      PerpsDepositProcessingViewSelectorsIDs.STATUS_DESCRIPTION,
    );
  }

  get viewBalanceButton(): DetoxElement {
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
