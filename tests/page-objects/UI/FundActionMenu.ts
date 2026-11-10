import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';
import { type AppiumElement } from '../../framework';

class FundActionMenu {
  get depositButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON,
    );
  }

  get buyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
    );
  }

  get unifiedBuyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON,
    );
  }

  get sellButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
    );
  }

  async tapDepositButton(): Promise<void> {
    await Gestures.waitAndTap(this.depositButton);
  }

  async tapBuyButton(): Promise<void> {
    await Gestures.waitAndTap(this.buyButton);
  }

  async tapUnifiedBuyButton(): Promise<void> {
    await Gestures.waitAndTap(this.unifiedBuyButton, {
      elemDescription: 'Fund Action Menu - Unified Buy Button',
    });
  }

  /**
   * Open the fund action sheet (via `openSheet`) then tap Unified Buy.
   * Retries open + tap when the sheet does not expose `wallet-buy-unified-action`
   * (iOS smoke flake: buy tap lands before wallet home / sheet is ready).
   */
  async openAndTapUnifiedBuy(openSheet: () => Promise<void>): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await openSheet();
        await Gestures.waitAndTap(this.unifiedBuyButton, {
          elemDescription: 'Fund Action Menu - Unified Buy Button',
          // Short per-attempt timeout; outer executeWithRetry covers retries.
          timeout: 5000,
        });
      },
      {
        description:
          'Open Fund Action Menu and tap Unified Buy (wallet-buy-unified-action)',
      },
    );
  }

  async tapSellButton(): Promise<void> {
    await Gestures.waitAndTap(this.sellButton);
  }
}

export default new FundActionMenu();
