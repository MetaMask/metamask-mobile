import { SRPListSelectorsIDs } from '../../../../../app/components/UI/SRPList/SRPList.testIds';
import Matchers from '../../../../framework/Matchers';
import { type AppiumElement } from '../../../../framework';

class SRPListComponent {
  get srpList(): Promise<AppiumElement> {
    return Matchers.getElementByID(SRPListSelectorsIDs.SRP_LIST);
  }
}

export default new SRPListComponent();
