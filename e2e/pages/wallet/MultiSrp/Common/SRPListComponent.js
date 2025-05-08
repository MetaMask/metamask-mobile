import { SRPListIds } from '../../../../selectors/MultiSRP/SRPList.selectors';
import Matchers from '../../../../utils/Matchers';
import Gestures from '../../../../utils/Gestures';

class SRPListComponent {
  get SRP_LIST() {
    return Matchers.getElementByID(SRPListIds.CONTAINER);
  }
}

export default new SRPListComponent();
