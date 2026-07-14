import {
  PerpsHomeViewSelectorsIDs,
  PerpsMarketBalanceActionsSelectorsIDs,
} from '../../../app/components/UI/Perps/Perps.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import enContent from '../../../locales/languages/en.json';
import { EncapsulatedElementType } from '../../framework';

class PerpsHomeView {
  get exploreCrypto(): EncapsulatedElementType {
    return Matchers.getElementByText(enContent.perps.home.crypto);
  }

  get backHome(): EncapsulatedElementType {
    return Matchers.getElementByID(PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON);
  }

  get withdrawButton(): EncapsulatedElementType {
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
}

export default new PerpsHomeView();
