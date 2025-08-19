import { WalletViewSelectorsIDs } from '../../selectors/wallet/WalletView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class SortModal {
  get sortAlphabetically(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.SORT_ALPHABETICAL);
  }

  get sortFiatAmount(): DetoxElement {
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
