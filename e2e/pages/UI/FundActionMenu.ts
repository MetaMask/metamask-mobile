import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';

class FundActionMenu {
  get depositButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.DEPOSIT_BUTTON,
    );
  }

  get buyButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.BUY_BUTTON,
    );
  }

  get sellButton(): DetoxElement {
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

  async tapSellButton(): Promise<void> {
    await Gestures.waitAndTap(this.sellButton);
  }
}

export default new FundActionMenu();
