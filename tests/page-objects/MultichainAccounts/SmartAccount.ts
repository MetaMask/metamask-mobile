import Matchers from '../../framework/Matchers';
import { SmartAccountIds } from '../../../app/components/Views/MultichainAccounts/SmartAccount.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SmartAccount {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SmartAccountIds.SMART_ACCOUNT_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SmartAccountIds.SMART_ACCOUNT_CONTAINER,
        ),
    });
  }

  get smartAccountSwitch(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SmartAccountIds.SMART_ACCOUNT_SWITCH),
      appium: () =>
        PlaywrightMatchers.getElementById(SmartAccountIds.SMART_ACCOUNT_SWITCH),
    });
  }

  async tapSmartAccountSwitch(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.smartAccountSwitch, {
      elemDescription: 'Smart Account Switch in Smart Account',
    });
  }
}

export default new SmartAccount();
