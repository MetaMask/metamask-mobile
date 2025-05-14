import { SRPListItemSelectorsIDs } from '../../../../selectors/MultiSRP/SRPListItem.selectors';
import Matchers from '../../../../utils/Matchers';
import Gestures from '../../../../utils/Gestures';

class SRPListItemComponent {
  get listItem() {
    return Matchers.getElementByID(SRPListItemSelectorsIDs.CONTAINER);
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

  async tapListItem(srpId) {
    const srpSelector = Matchers.getElementByID(
      `${SRPListItemSelectorsIDs.SRP_LIST_ITEM}-${srpId}`,
    );
    await Gestures.waitAndTap(srpSelector);
  }
}

export default new SRPListItemComponent();
