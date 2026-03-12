import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SwitchChainModal {
  get connectButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementById('connect-button'),
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

  async tapConnectButton(): Promise<void> {
    await UnifiedGestures.tap(this.connectButton);
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
