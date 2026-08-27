import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SmartAccountIds } from '../../../app/components/Views/MultichainAccounts/SmartAccount.testIds';
import { type AppiumElement } from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';
import Assertions from '../../framework/Assertions';

class SmartAccount {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(SmartAccountIds.SMART_ACCOUNT_CONTAINER);
  }

  get smartAccountSwitch(): Promise<AppiumElement> {
    return Matchers.getElementByID(SmartAccountIds.SMART_ACCOUNT_SWITCH);
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

    await Gestures.scrollIntoView(Matchers.getElementByText(networkName));

    const switchEl = PlatformDetector.isIOS()
      ? await this.getIosSwitchInNetworkRow(networkName)
      : await this.getAndroidSwitchInNetworkRow(networkName);

    await Gestures.waitAndTap(Promise.resolve(switchEl), {
      elemDescription: `Smart account switch for "${networkName}"`,
      timeout: 15_000,
      checkForDisplayed: false,
      checkEnabled: false,
    });
  }

  private async getAndroidSwitchInNetworkRow(
    networkName: string,
  ): Promise<AppiumElement> {
    // UiAutomator2 XPath2 breaks on `/following::*` — use Y-alignment instead.
    return this.getFallbackSwitchAlignedToLabel(networkName);
  }

  /** Prefer first switch after the network label; fall back to Y-alignment. */
  private async getIosSwitchInNetworkRow(
    networkName: string,
  ): Promise<AppiumElement> {
    const switchId = SmartAccountIds.SMART_ACCOUNT_SWITCH;
    const byTestIdXPath = `//*[@name='${networkName}' or @label='${networkName}']/following::*[@name='${switchId}'][1]`;
    const byTestId = await Matchers.getAllElementsByXPath(byTestIdXPath);
    if (byTestId.length > 0) {
      return byTestId[0];
    }

    const byTypeXPath = `//*[@name='${networkName}' or @label='${networkName}']/following::XCUIElementTypeSwitch[1]`;
    const byType = await Matchers.getAllElementsByXPath(byTypeXPath);
    if (byType.length > 0) {
      return byType[0];
    }

    return this.getFallbackSwitchAlignedToLabel(networkName);
  }

  /** Pick switch to the right of the label with closest center Y. */
  private async getFallbackSwitchAlignedToLabel(
    networkName: string,
  ): Promise<AppiumElement> {
    const labelEl = (await Matchers.getElementByText(
      networkName,
    )) as AppiumElement;
    await Gestures.scrollIntoView(labelEl);

    const labelLocation = await labelEl.unwrap().getLocation();
    const labelSize = await labelEl.unwrap().getSize();
    const labelCenterY = labelLocation.y + labelSize.height / 2;
    const labelRightX = labelLocation.x + labelSize.width;

    const switchElements = PlatformDetector.isIOS()
      ? await this.getIosSmartAccountSwitches()
      : await this.getAndroidSmartAccountSwitches();
    if (switchElements.length === 0) {
      throw new Error(
        `No smart-account switches found while targeting "${networkName}"`,
      );
    }

    let bestSwitch: AppiumElement | undefined;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const switchEl of switchElements) {
      const switchLocation = await switchEl.unwrap().getLocation();
      const switchSize = await switchEl.unwrap().getSize();
      const switchCenterY = switchLocation.y + switchSize.height / 2;
      const switchCenterX = switchLocation.x + switchSize.width / 2;
      if (switchCenterX <= labelRightX) {
        continue;
      }
      const delta = Math.abs(switchCenterY - labelCenterY);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestSwitch = switchEl;
      }
    }

    if (!bestSwitch || bestDelta > Math.max(labelSize.height * 2, 64)) {
      throw new Error(
        `Could not align switch to "${networkName}" (Δy=${Math.round(bestDelta)})`,
      );
    }

    return bestSwitch;
  }

  private async getAndroidSmartAccountSwitches(): Promise<AppiumElement[]> {
    return Matchers.getAllElementsByXPath(
      `//*[@resource-id='${SmartAccountIds.SMART_ACCOUNT_SWITCH}']`,
    );
  }

  /** Prefer testID; fall back to XCUIElementTypeSwitch if iOS drops it. */
  private async getIosSmartAccountSwitches(): Promise<AppiumElement[]> {
    const byTestId = await Matchers.getAllElementsByXPath(
      `//*[@name='${SmartAccountIds.SMART_ACCOUNT_SWITCH}']`,
    );
    if (byTestId.length > 0) {
      return byTestId;
    }

    return Matchers.getAllElementsByXPath('//XCUIElementTypeSwitch');
  }
}

export default new SmartAccount();
