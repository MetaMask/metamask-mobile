import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { AddressListIds } from '../../../app/components/Views/MultichainAccounts/AddressList/AddressList.testIds';
import { EncapsulatedElementType } from '../../framework';

class AddressList {
  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(AddressListIds.GO_BACK);
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button in Address List',
    });
  }
}

export default new AddressList();
