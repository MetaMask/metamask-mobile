import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { CardHomeSelectors } from '../../../app/components/UI/Card/Views/CardHome/CardHome.testIds';
import { type AppiumElement } from '../../framework';

class CardHomeView {
  get tryAgainButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardHomeSelectors.TRY_AGAIN_BUTTON);
  }

  get privacyToggleButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardHomeSelectors.PRIVACY_TOGGLE_BUTTON);
  }

  get addFundsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardHomeSelectors.ADD_FUNDS_BUTTON);
  }

  get addFundsBottomSheet(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET);
  }

  get addFundsBottomSheetDepositOption(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_DEPOSIT_OPTION,
    );
  }

  get addFundsBottomSheetSwapOption(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_SWAP_OPTION,
    );
  }

  get cardViewTitle(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardHomeSelectors.CARD_VIEW_TITLE);
  }

  get swapScreenSourceTokenArea(): Promise<AppiumElement> {
    return Matchers.getElementByID('source-token-area');
  }

  async tapTryAgainButton(): Promise<void> {
    await Gestures.waitAndTap(this.tryAgainButton, {
      elemDescription: 'Try Again Button in Card Home View',
    });
  }

  async tapPrivacyToggleButton(): Promise<void> {
    await Gestures.waitAndTap(this.privacyToggleButton, {
      elemDescription: 'Privacy Toggle Button in Card Home View',
    });
  }

  async tapAddFundsButton(): Promise<void> {
    await Gestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Add Funds Button in Card Home View',
    });
  }

  async tapAddFundsBottomSheetDepositOption(): Promise<void> {
    await Gestures.waitAndTap(this.addFundsBottomSheetDepositOption, {
      elemDescription:
        'Add Funds Bottom Sheet Deposit Option in Card Home View',
    });
  }

  async tapAddFundsBottomSheetSwapOption(): Promise<void> {
    await Gestures.waitAndTap(this.addFundsBottomSheetSwapOption, {
      elemDescription: 'Add Funds Bottom Sheet Swap Option in Card Home View',
    });
  }
}

export default new CardHomeView();
