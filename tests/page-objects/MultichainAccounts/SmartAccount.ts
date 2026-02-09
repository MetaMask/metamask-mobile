import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { SmartAccountIds } from '../../../app/components/Views/MultichainAccounts/SmartAccount.testIds.ts';

class SmartAccount {
  get container(): DetoxElement {
    return Matchers.getElementByID(SmartAccountIds.SMART_ACCOUNT_CONTAINER);
  }

  get smartAccountSwitch(): DetoxElement {
    return Matchers.getElementByID(SmartAccountIds.SMART_ACCOUNT_SWITCH);
  }

  async tapSmartAccountSwitch(): Promise<void> {
    await Gestures.waitAndTap(this.smartAccountSwitch, {
      elemDescription: 'Smart Account Switch in Smart Account',
    });
  }
}

export default new SmartAccount();
