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
import Utilities from '../../framework/Utilities';
import { getDriver } from '../../framework/PlaywrightUtilities';

/** Mirrors MultichainAddressRow.constants — inlined to avoid RN design-system imports in e2e. */
const MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID =
  'multichain-address-row-network-name';

class AddressList {
  private appiumScreenReady = false;

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
    const timeout = 30_000;

    if (FrameworkDetector.isAppium() && this.appiumScreenReady) {
      return;
    }

    if (FrameworkDetector.isAppium()) {
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
              await PlaywrightGestures.scrollIntoView(row, {
                scrollParams: { direction: 'down' },
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
      this.appiumScreenReady = true;
      return;
    }

    await Assertions.expectElementToBeVisible(this.backButton, {
      description: 'Address list screen should be visible',
      timeout,
    });
  }

  async expectNetworkDisplayed(networkName: string): Promise<void> {
    await this.waitForScreen();
    const timeout = 15_000;

    if (FrameworkDetector.isAppium()) {
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
              await PlaywrightGestures.scrollIntoView(row, {
                scrollParams: { direction: 'down' },
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
      return;
    }

    await Assertions.expectElementToBeVisible(
      this.networkNameElement(networkName),
      {
        description: `${networkName} should be visible in the networks list`,
        timeout,
      },
    );
  }

  async tapBackButton(): Promise<void> {
    if (FrameworkDetector.isAppium() && PlatformDetector.isIOS()) {
      const backEl = await asPlaywrightElement(this.backButton);
      try {
        await PlaywrightGestures.waitAndTap(backEl, {
          timeout: 10_000,
          checkForDisplayed: false,
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
