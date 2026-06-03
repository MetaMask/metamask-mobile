import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class FundActionMenu {
  get depositButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON,
        ),
    });
  }

  get buyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
        ),
    });
  }

  get unifiedBuyButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON,
        ),
    });
  }

  get sellButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletActionsBottomSheetSelectorsIDs.SELL_BUTTON,
        ),
    });
  }

  async tapDepositButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.depositButton);
  }

  async tapBuyButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.buyButton);
  }
  async tapUnifiedBuyButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.unifiedBuyButton);
  }

  async tapSellButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.sellButton);
  }
}

export default new FundActionMenu();
