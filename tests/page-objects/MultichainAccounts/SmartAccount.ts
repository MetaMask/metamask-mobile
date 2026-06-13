import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SmartAccountIds } from '../../../app/components/Views/MultichainAccounts/SmartAccount.testIds';
import { EncapsulatedElementType } from '../../framework';

class SmartAccount {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(SmartAccountIds.SMART_ACCOUNT_CONTAINER);
  }

  get smartAccountSwitch(): EncapsulatedElementType {
    return Matchers.getElementByID(SmartAccountIds.SMART_ACCOUNT_SWITCH);
  }

  async tapSmartAccountSwitch(): Promise<void> {
    await Gestures.waitAndTap(this.smartAccountSwitch, {
      elemDescription: 'Smart Account Switch in Smart Account',
    });
  }
}

export default new SmartAccount();
