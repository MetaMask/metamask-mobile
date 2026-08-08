import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework';

class FundActionMenu {
  get depositButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON,
    );
  }

  get buyButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
    );
  }

  get unifiedBuyButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.BUY_UNIFIED_BUTTON,
    );
  }

  get sellButton(): EncapsulatedElementType {
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
    await Gestures.waitAndTap(this.unifiedBuyButton);
  }

  async tapSellButton(): Promise<void> {
    await Gestures.waitAndTap(this.sellButton);
  }
}

export default new FundActionMenu();
