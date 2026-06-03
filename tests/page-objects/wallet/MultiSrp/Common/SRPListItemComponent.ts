import { SRPListItemSelectorsIDs } from '../../../../../app/components/UI/SRPListItem/SRPListItem.testIds';
import Matchers from '../../../../framework/Matchers';
import UnifiedGestures from '../../../../framework/UnifiedGestures';

class SRPListItemComponent {
  get listItem() {
    return Matchers.getElementByID(SRPListItemSelectorsIDs.SRP_LIST_ITEM);
  }

  get accountToggle() {
    return Matchers.getElementByID(
      SRPListItemSelectorsIDs.SRP_LIST_ITEM_TOGGLE_SHOW,
    );
  }

  get accountList() {
    return Matchers.getElementByID(
      SRPListItemSelectorsIDs.SRP_LIST_ITEM_ACCOUNTS_LIST,
    );
  }

  async tapToggle() {
    await UnifiedGestures.waitAndTap(this.accountToggle);
  }

  async tapListItem(srpId: string) {
    const srpSelector = Matchers.getElementByID(
      `${SRPListItemSelectorsIDs.SRP_LIST_ITEM}-${srpId}`,
    );
    await UnifiedGestures.waitAndTap(srpSelector);
  }

  async tapListItemByIndex(index: number) {
    const srpSelector = Matchers.getElementByID(
      new RegExp(`^${SRPListItemSelectorsIDs.SRP_LIST_ITEM}-\\w+$`),
      index,
    );
    await UnifiedGestures.waitAndTap(srpSelector, {
      elemDescription: `SRP List Item at index ${index}`,
    });
  }
}

export default new SRPListItemComponent();
