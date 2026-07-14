import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { EncapsulatedElementType } from '../../framework';

class SortModal {
  get sortAlphabetically(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.SORT_ALPHABETICAL);
  }

  get sortFiatAmount(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.SORT_DECLINING_BALANCE,
    );
  }

  async tapSortAlphabetically(): Promise<void> {
    await Gestures.waitAndTap(this.sortAlphabetically, {
      elemDescription: 'Sort Alphabetically',
    });
  }

  async tapSortFiatAmount(): Promise<void> {
    await Gestures.waitAndTap(this.sortFiatAmount, {
      elemDescription: 'Sort by Fiat Amount',
    });
  }
}

export default new SortModal();
