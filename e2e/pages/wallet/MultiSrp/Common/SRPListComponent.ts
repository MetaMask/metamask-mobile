import { SRPListSelectorsIDs } from '../../../../selectors/MultiSRP/SRPList.selectors';
import Matchers from '../../../../utils/Matchers';

class SRPListComponent {
  get srpList() {
    return Matchers.getElementByID(SRPListSelectorsIDs.SRP_LIST);
  }
}

export default new SRPListComponent();
