import { SRPListItemSelectorsIDs } from '../../../../selectors/MultiSRP/SRPListItem.selectors';
import Matchers from '../../../../framework/Matchers.ts';
import Gestures from '../../../../framework/Gestures.ts';

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
    await Gestures.waitAndTap(this.accountToggle);
  }

  async tapListItem(srpId: string) {
    const srpSelector = Matchers.getElementByID(
      `${SRPListItemSelectorsIDs.SRP_LIST_ITEM}-${srpId}`,
    );
    await Gestures.waitAndTap(srpSelector);
  }

  async tapListItemByIndex(index: number) {
    const srpSelector = Matchers.getElementByID(
      new RegExp(`^${SRPListItemSelectorsIDs.SRP_LIST_ITEM}-\\w+$`),
      index,
    );
    await Gestures.waitAndTap(srpSelector, {
      checkEnabled: false,
      elemDescription: `SRP List Item at index ${index}`,
    });
  }
}

export default new SRPListItemComponent();
