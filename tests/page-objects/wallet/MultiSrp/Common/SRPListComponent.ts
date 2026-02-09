import { SRPListSelectorsIDs } from '../../../../../app/components/UI/SRPList/SRPList.testIds.ts';
import Matchers from '../../../../framework/Matchers.ts';

class SRPListComponent {
  get srpList(): DetoxElement {
    return Matchers.getElementByID(SRPListSelectorsIDs.SRP_LIST);
  }
}

export default new SRPListComponent();
