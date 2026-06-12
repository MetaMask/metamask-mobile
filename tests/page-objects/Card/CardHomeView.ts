import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { CardHomeSelectors } from '../../../app/components/UI/Card/Views/CardHome/CardHome.testIds';

class CardHomeView {
  get tryAgainButton(): DetoxElement {
    return Matchers.getElementByID(CardHomeSelectors.TRY_AGAIN_BUTTON);
  }

  get privacyToggleButton(): DetoxElement {
    return Matchers.getElementByID(CardHomeSelectors.PRIVACY_TOGGLE_BUTTON);
  }

  get addFundsButton(): DetoxElement {
    return Matchers.getElementByID(CardHomeSelectors.ADD_FUNDS_BUTTON);
  }

  get addFundsBottomSheet(): DetoxElement {
    return Matchers.getElementByID(CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET);
  }

  get addFundsBottomSheetDepositOption(): DetoxElement {
    return Matchers.getElementByID(
      CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_DEPOSIT_OPTION,
    );
  }

  get addFundsBottomSheetSwapOption(): DetoxElement {
    return Matchers.getElementByID(
      CardHomeSelectors.ADD_FUNDS_BOTTOM_SHEET_SWAP_OPTION,
    );
  }

  get cardViewTitle(): DetoxElement {
    return Matchers.getElementByID(CardHomeSelectors.CARD_VIEW_TITLE);
  }

  get swapScreenSourceTokenArea(): DetoxElement {
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
