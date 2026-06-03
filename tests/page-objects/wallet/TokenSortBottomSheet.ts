import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SortModal {
  get sortAlphabetically(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.SORT_ALPHABETICAL),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.SORT_ALPHABETICAL,
        ),
    });
  }

  get sortFiatAmount(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.SORT_DECLINING_BALANCE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.SORT_DECLINING_BALANCE,
        ),
    });
  }

  async tapSortAlphabetically(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.sortAlphabetically, {
      elemDescription: 'Sort Alphabetically',
    });
  }

  async tapSortFiatAmount(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.sortFiatAmount, {
      elemDescription: 'Sort by Fiat Amount',
    });
  }
}

export default new SortModal();
