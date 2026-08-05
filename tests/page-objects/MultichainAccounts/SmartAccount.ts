import Matchers from '../../framework/Matchers';
import {
  SmartAccountIds,
  getSmartAccountSwitchTestId,
} from '../../../app/components/Views/MultichainAccounts/SmartAccount.testIds';
import { EncapsulatedElementType } from '../../framework';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import Assertions from '../../framework/Assertions';

class SmartAccount {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(SmartAccountIds.SMART_ACCOUNT_CONTAINER);
  }

  get smartAccountSwitch(): EncapsulatedElementType {
    return Matchers.getElementByID(
      new RegExp(`^${SmartAccountIds.SMART_ACCOUNT_SWITCH}-`),
    );
  }

  /**
   * Toggle smart-account switch for a network row (e.g. Local RPC).
   */
  async tapSmartAccountSwitchForNetwork(networkName: string): Promise<void> {
    await Assertions.expectElementToExist(
      Matchers.getElementByText(networkName),
      {
        description: `Smart account network row "${networkName}"`,
        timeout: 20_000,
      },
    );

    const labelEl = await PlaywrightMatchers.getElementByText(networkName);
    await PlaywrightGestures.scrollIntoView(labelEl);

    const switchEl = await PlaywrightMatchers.getElementById(
      getSmartAccountSwitchTestId(networkName),
    );
    await PlaywrightGestures.waitAndTap(switchEl, {
      elemDescription: `Smart account switch for "${networkName}"`,
      timeout: 15_000,
      checkForDisplayed: false,
      checkForEnabled: false,
    });
  }
}

export default new SmartAccount();
