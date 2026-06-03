import Matchers from '../../framework/Matchers';
import { AddressListIds } from '../../../app/components/Views/MultichainAccounts/AddressList/AddressList.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AddressList {
  get backButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(AddressListIds.GO_BACK),
      appium: () => PlaywrightMatchers.getElementById(AddressListIds.GO_BACK),
    });
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button in Address List',
    });
  }
}

export default new AddressList();
