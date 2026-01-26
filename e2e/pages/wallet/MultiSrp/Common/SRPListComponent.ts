import { SRPListSelectorsIDs } from '../../../../../app/components/UI/SRPList/SRPList.testIds';
import Matchers from '../../../../../tests/framework/Matchers';

class SRPListComponent {
  get srpList(): DetoxElement {
    return Matchers.getElementByID(SRPListSelectorsIDs.SRP_LIST);
  }
}

export default new SRPListComponent();
