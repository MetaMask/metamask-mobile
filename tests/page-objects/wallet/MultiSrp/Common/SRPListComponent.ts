import { SRPListSelectorsIDs } from '../../../../../app/components/UI/SRPList/SRPList.testIds';
import Matchers from '../../../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../../framework/PlaywrightMatchers';

class SRPListComponent {
  get srpList(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(SRPListSelectorsIDs.SRP_LIST),
      appium: () =>
        PlaywrightMatchers.getElementById(SRPListSelectorsIDs.SRP_LIST),
    });
  }
}

export default new SRPListComponent();
