import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { AddressListIds } from '../../../app/components/Views/MultichainAccounts/AddressList/AddressList.testIds';
import { EncapsulatedElementType, getDriver } from '../../framework';
import { PlatformDetector } from '../../framework/PlatformLocator';
import Utilities from '../../framework/Utilities';

/** Mirrors MultichainAddressRow.constants — inlined to avoid RN design-system imports in e2e. */
const MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID =
  'multichain-address-row-network-name';

class AddressList {
  private screenReady = false;

  get backButton(): EncapsulatedElementType {
    return Matchers.getElementByID(AddressListIds.GO_BACK);
  }

  networkNameElement(networkName: string): EncapsulatedElementType {
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByNativeXPath(
        `//*[@resource-id='${MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}' and contains(@text,'${networkName}')]`,
      );
    }
    return Matchers.getElementByNativeXPath(
      `//*[@name='${MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}' and (contains(@label,'${networkName}') or contains(@name,'${networkName}'))]`,
    );
  }

  async waitForScreen(): Promise<void> {
    const timeout = 30_000;

    if (this.screenReady) {
      return;
    }

    const networkRowXpath = PlatformDetector.isAndroid()
      ? `//*[@resource-id='${MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}']`
      : `//*[@name='${MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}']`;

    await Utilities.executeWithRetry(
      async () => {
        const rows = await Matchers.getAllElementsByXPath(networkRowXpath);
        if (rows.length === 0) {
          return false;
        }

        for (const row of rows) {
          try {
            await Gestures.scrollIntoView(row, {
              direction: 'down',
              maxScrolls: 8,
            });
            if (await row.isVisible()) {
              return true;
            }
          } catch {
            // try the next rendered row
          }
        }

        return false;
      },
      {
        description: 'Address list should show at least one network row',
        timeout,
        interval: 500,
      },
    );
    this.screenReady = true;
  }

  async expectNetworkDisplayed(networkName: string): Promise<void> {
    await this.waitForScreen();
    const timeout = 15_000;

    const networkRowXpath = PlatformDetector.isAndroid()
      ? `//*[@resource-id='${MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}' and contains(@text,'${networkName}')]`
      : `//*[@name='${MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}' and (contains(@label,'${networkName}') or contains(@name,'${networkName}'))]`;

    await Utilities.executeWithRetry(
      async () => {
        const rows = await Matchers.getAllElementsByXPath(networkRowXpath);
        if (rows.length === 0) {
          return false;
        }

        for (const row of rows) {
          try {
            await Gestures.scrollIntoView(row, {
              direction: 'down',
              maxScrolls: 8,
            });
            if (await row.isVisible()) {
              return true;
            }
          } catch {
            // try the next rendered row
          }
        }

        return false;
      },
      {
        description: `${networkName} should be visible in the networks list`,
        timeout,
        interval: 500,
      },
    );
  }

  async tapBackButton(): Promise<void> {
    if (PlatformDetector.isIOS()) {
      try {
        await Gestures.waitAndTap(this.backButton, {
          timeout: 10_000,
          checkForDisplayed: false,
          elemDescription: 'Back Button in Address List',
        });
      } catch {
        const drv = getDriver();
        if (!drv) {
          throw new Error('Driver is not available');
        }
        await drv.back();
      }
      return;
    }

    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button in Address List',
    });
  }
}

export default new AddressList();
