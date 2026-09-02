import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { CardHomeSelectors } from '../../../app/components/UI/Card/Views/CardHome/CardHome.testIds';
import { type AppiumElement } from '../../framework';

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
   * True when Card Home main content is present (not the error screen).
   * Prefers Add Funds (or its loading skeleton) over ScrollView title
   * `isDisplayed`, which can lag on Android after navigation.
   */
  private async isMainContentReady(): Promise<boolean> {
    if (await Utilities.isElementVisible(this.addFundsButton, 800)) {
      return true;
    }
    if (await Utilities.isElementVisible(this.addFundsButtonSkeleton, 500)) {
      return true;
    }
    return Utilities.isElementVisible(this.cardViewTitle, 500);
  }

  /**
   * Opens Card Home from wallet and retries until main content is ready.
   *
   * CI flakes when a single Card navbar tap does not navigate (analytics shows
   * only "Card Button Viewed", never "Card Home Clicked") or when Card Home
   * lands on the error screen without `card-view-title`.
   *
   * @param openSheet - Opens Card Home (typically `WalletView.tapNavbarCardButton`).
   */
  async openFromWallet(
    openSheet: () => Promise<void>,
    timeout = CARD_HOME_OPEN_TIMEOUT_MS,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        if (await this.isMainContentReady()) {
          await Assertions.expectElementToBeVisible(this.addFundsButton, {
            timeout: 20_000,
            description: 'Card Home Add Funds button',
          });
          return;
        }

        if (await Utilities.isElementVisible(this.tryAgainButton, 500)) {
          await this.tapTryAgainButton();
          if (!(await this.isMainContentReady())) {
            throw new Error(
              'Card Home still not ready after tapping Try Again',
            );
          }
          await Assertions.expectElementToBeVisible(this.addFundsButton, {
            timeout: 20_000,
            description: 'Card Home Add Funds button after Try Again',
          });
          return;
        }

        await openSheet();

        if (await Utilities.isElementVisible(this.tryAgainButton, 2_000)) {
          await this.tapTryAgainButton();
        }

        if (!(await this.isMainContentReady())) {
          throw new Error(
            'Card Home did not open after Card navbar tap (add-funds / title missing)',
          );
        }

        await Assertions.expectElementToBeVisible(this.addFundsButton, {
          timeout: 20_000,
          description: 'Card Home Add Funds button after open',
        });
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
