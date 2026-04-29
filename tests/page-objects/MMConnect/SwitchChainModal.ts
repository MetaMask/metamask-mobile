import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import { sleep } from '../../framework';

class SwitchChainModal {
  get connectButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById(CommonSelectorsIDs.CONNECT_BUTTON, {
          exact: true,
        }),
    });
  }

  getNetworkText(network: string): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          `//android.widget.TextView[@text="Requesting for ${network}"]`,
        ),
    });
  }

  async tapConnectButton({
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.connectButton);
        await element.waitForDisplayed({
          timeoutMsg: 'SwitchChainModal: connect button not visible',
        });
        await element.click();
        if (shouldCooldown) {
          await sleep(timeToCooldown);
        }
      },
    });
  }

  async assertNetworkText(network: string): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.getNetworkText(network));
        await element.waitForDisplayed({
          timeoutMsg: `SwitchChainModal: network text "${network}" not visible`,
        });
      },
    });
  }
}

export default new SwitchChainModal();
