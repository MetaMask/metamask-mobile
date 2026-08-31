import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { sleep, type EncapsulatedElementType } from '../../framework';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';

class SwitchChainModal {
  get connectButton(): EncapsulatedElementType {
    return Matchers.getElementByID(CommonSelectorsIDs.CONNECT_BUTTON);
  }

  getNetworkText(network: string): EncapsulatedElementType {
    return Matchers.getElementByNativeXPath(
      `//android.widget.TextView[@text="Requesting for ${network}"]`,
    );
  }

  async tapConnectButton({
    shouldCooldown = false,
    timeToCooldown = 1000,
  }: {
    shouldCooldown?: boolean;
    timeToCooldown?: number;
  } = {}): Promise<void> {
    await Gestures.waitAndTap(this.connectButton, {
      elemDescription: 'SwitchChainModal connect button',
    });
    if (shouldCooldown) {
      await sleep(timeToCooldown);
    }
  }

  async assertNetworkText(network: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.getNetworkText(network), {
      description: `SwitchChainModal: network text "${network}" not visible`,
    });
  }
}

export default new SwitchChainModal();
