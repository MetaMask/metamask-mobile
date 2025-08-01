import { SRPListSelectorsIDs } from '../../../../selectors/MultiSRP/SRPList.selectors';
import Matchers from '../../../../framework/Matchers';

class SRPListComponent {
  get srpList(): DetoxElement {
    return Matchers.getElementByID(SRPListSelectorsIDs.SRP_LIST);
  }
}

export default new SRPListComponent();
