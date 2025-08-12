import { WalletViewSelectorsIDs } from '../../selectors/wallet/WalletView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class SortModal {
  get sortAlphabetically() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.SORT_ALPHABETICAL);
  }

  get sortFiatAmount() {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.SORT_DECLINING_BALANCE,
    );
  }

  async tapSortAlphabetically() {
    await Gestures.waitAndTap(this.sortAlphabetically);
  }

  async tapSortFiatAmount() {
    await Gestures.waitAndTap(this.sortFiatAmount);
  }
}

export default new SortModal();
