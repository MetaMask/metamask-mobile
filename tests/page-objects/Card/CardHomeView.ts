import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';
import { CardHomeSelectors } from '../../../app/components/UI/Card/Views/CardHome/CardHome.testIds';
import { type AppiumElement } from '../../framework';
import WalletView from '../wallet/WalletView';

/** Budget for Card Home open + on-chain asset fetch after a wallet Card tap. */
const CARD_HOME_OPEN_TIMEOUT_MS = 45_000;

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

  get addFundsButtonSkeleton(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON);
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

  /**
   * Opens Card Home from wallet and retries until Add Funds is ready.
   *
   * Re-taps Card only while the wallet Card button remains visible so a
   * successful navigation emits a single "Card Home Clicked" event.
   *
   * @param openSheet - Opens Card Home (typically `WalletView.tapNavbarCardButton`).
   */
  async openFromWallet(
    openSheet: () => Promise<void>,
    timeout = CARD_HOME_OPEN_TIMEOUT_MS,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        if (await Utilities.isElementVisible(this.addFundsButton, 500)) {
          return;
        }

        if (await Utilities.isElementVisible(this.tryAgainButton, 500)) {
          await this.tapTryAgainButton();
          throw new Error('Waiting for Add Funds after tapping Try Again');
        }

        if (
          await Utilities.isElementVisible(WalletView.navbarCardButton, 500)
        ) {
          await openSheet();
          throw new Error('Waiting for Add Funds after tapping Card');
        }

        throw new Error('Waiting for Card Home Add Funds button');
      },
      {
        timeout,
        interval: 2_000,
        description: 'Open Card Home until Add Funds is ready',
      },
    );
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
