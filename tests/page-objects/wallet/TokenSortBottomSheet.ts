import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { type AppiumElement } from '../../framework';

class SortModal {
  get sortAlphabetically(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.SORT_ALPHABETICAL);
  }

  get sortFiatAmount(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.SORT_DECLINING_BALANCE,
    );
  }

  get applyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.SORT_APPLY);
  }

  async tapApply(): Promise<void> {
    await Gestures.waitAndTap(this.applyButton, {
      elemDescription: 'Apply sort',
    });
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
