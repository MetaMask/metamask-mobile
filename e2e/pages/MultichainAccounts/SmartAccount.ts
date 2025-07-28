import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SmartAccountIds } from '../../selectors/MultichainAccounts/SmartAccount.selectors';

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
