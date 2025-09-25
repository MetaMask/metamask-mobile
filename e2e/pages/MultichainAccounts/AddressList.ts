import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { AddressListIds } from '../../selectors/MultichainAccounts/AddressList.selectors';

class AddressList {
  get backButton(): DetoxElement {
    return Matchers.getElementByID(AddressListIds.GO_BACK);
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button in Address List',
    });
  }
}

export default new AddressList();
