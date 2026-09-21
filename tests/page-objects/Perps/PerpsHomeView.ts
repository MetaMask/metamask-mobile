import {
  PerpsHomeViewSelectorsIDs,
  PerpsMarketBalanceActionsSelectorsIDs,
} from '../../../app/components/UI/Perps/Perps.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import enContent from '../../../locales/languages/en.json';
import { type AppiumElement } from '../../framework';

class PerpsHomeView {
  get exploreCrypto(): Promise<AppiumElement> {
    return Matchers.getElementByText(enContent.perps.home.crypto);
  }

  get backHome(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON);
  }

  get addFundsButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
    );
  }

  get withdrawButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      PerpsMarketBalanceActionsSelectorsIDs.WITHDRAW_BUTTON,
    );
  }

  async tapExploreCrypto(): Promise<void> {
    await Gestures.waitAndTap(this.exploreCrypto, {
      elemDescription: 'Perps Explore Crypto Button',
    });
  }

  async tapExploreCryptoIfVisible(): Promise<void> {
    const isVisible = await Utilities.isElementVisible(
      this.exploreCrypto,
      1500,
    );
    if (isVisible) {
      await Gestures.waitAndTap(this.exploreCrypto, {
        elemDescription: 'Perps Explore Crypto Button',
      });
    }
  }

  async tapBackHomeButton(): Promise<void> {
    await Gestures.waitAndTap(this.backHome, {
      elemDescription: 'Perps Back Home Button',
    });
  }

  async tapAddFundsButton(): Promise<void> {
    await Gestures.waitAndTap(this.addFundsButton, {
      elemDescription: 'Add Funds button',
    });
  }

  /**
   * Waits for the Withdraw CTA to mount. It only appears once the live Perps
   * account hydrates and the balance is non-empty (the empty/loading state
   * shows Add funds only), so the account stream needs time to land.
   */
  async waitForWithdrawButton(timeout = 30000): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const isVisible = await Utilities.isElementVisible(
          this.withdrawButton,
          2000,
        );
        if (!isVisible) {
          throw new Error('Perps Withdraw CTA is not visible yet');
        }
      },
      { interval: 1000, timeout },
    );
  }

  async tapWithdrawButton(): Promise<void> {
    await Gestures.waitAndTap(this.withdrawButton, {
      elemDescription: 'Perps Withdraw button',
    });
  }

  get footerWithdrawButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(PerpsHomeViewSelectorsIDs.WITHDRAW_BUTTON);
  }

  async tapFooterWithdrawButton(): Promise<void> {
    await Gestures.waitAndTap(this.footerWithdrawButton, {
      elemDescription: 'Perps Withdraw button (fixed footer)',
    });
  }

  /**
   * Taps whichever Withdraw CTA is currently visible — header balance-actions
   * button preferred, fixed-footer button as fallback. The header button only
   * mounts once the live account hydrates with a non-empty balance, while the
   * footer renders under `showsFixedFooter`; depending on scroll position and
   * load timing either one may be the interactable target.
   */
  async tapVisibleWithdrawButton(): Promise<void> {
    if (await Utilities.isElementVisible(this.withdrawButton, 2000)) {
      await this.tapWithdrawButton();
      return;
    }
    await this.tapFooterWithdrawButton();
  }
}

export default new PerpsHomeView();
