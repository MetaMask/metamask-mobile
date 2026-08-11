import { SRPListSelectorsIDs } from '../../../../../app/components/UI/SRPList/SRPList.testIds';
import Matchers from '../../../../framework/Matchers';
import { EncapsulatedElementType } from '../../../../framework';

class SRPListComponent {
  get srpList(): EncapsulatedElementType {
    return Matchers.getElementByID(SRPListSelectorsIDs.SRP_LIST);
  }
}

export default new SRPListComponent();
