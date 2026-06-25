import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { AddressListIds } from '../../../app/components/Views/MultichainAccounts/AddressList/AddressList.testIds';
import {
  EncapsulatedElementType,
  asPlaywrightElement,
  encapsulated,
} from '../../framework';
import Assertions from '../../framework/Assertions';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import { FrameworkDetector } from '../../framework/FrameworkDetector';
import { PlatformDetector } from '../../framework/PlatformLocator';

/** Mirrors MultichainAddressRow.constants — inlined to avoid RN design-system imports in e2e. */
const MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID =
  'multichain-address-row-network-name';

class AddressList {
  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(AddressListIds.GO_BACK);
  }

  networkNameElement(networkName: string): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(networkName),
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          PlatformDetector.isAndroid()
            ? `//*[@resource-id='${MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}' and contains(@text,'${networkName}')]`
            : `//*[@name='${MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}' and (contains(@label,'${networkName}') or contains(@name,'${networkName}'))]`,
        ),
    });
  }

  async waitForScreen(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.backButton, {
      description: 'Address list screen should be visible',
      timeout: 15_000,
    });
  }

  async expectNetworkDisplayed(networkName: string): Promise<void> {
    await this.waitForScreen();
    const networkRow = this.networkNameElement(networkName);
    if (FrameworkDetector.isAppium()) {
      await PlaywrightGestures.scrollIntoView(
        await asPlaywrightElement(networkRow),
      );
    }
    await Assertions.expectElementToBeVisible(networkRow, {
      description: `${networkName} should be visible in the networks list`,
      timeout: 15_000,
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button in Address List',
    });
  }
}

export default new AddressList();
