import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { Assertions } from '../../framework';

/**
 * Page Object for the DeFi full view screen.
 * Covers the screen shown after navigating to DeFi (from Homepage section or wallet tab):
 * header with network filter and list of DeFi positions.
 */
class DefiView {
  /** Main container wrapping the DeFi positions list and control bar */
  get container(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER,
    );
  }

  /** Network filter button ("Popular networks" with chevron) */
  get networkFilter(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
    );
  }

  async tapNetworkFilter(): Promise<void> {
    await Gestures.waitAndTap(this.networkFilter, {
      elemDescription: 'DeFi networks filter',
    });
  }

  /**
   * Taps a DeFi position row by its visible name (e.g. "Aave V3", "Uniswap V3").
   * Waits for the DeFi container first, then taps the position row.
   * Tries index 0 first; if the element is not hittable (duplicate from the
   * homepage navigation stack), retries with index 1.
   */
  async tapPosition(positionName: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Wait for DeFi container before tapping position',
    });
    const testID = WalletViewSelectorsIDs.DEFI_POSITION_LIST_ITEM(positionName);

    for (const index of [0, 1]) {
      try {
        const elem = Matchers.getElementByID(testID, index);
        await Gestures.waitAndTap(elem, {
          checkVisibility: false,
          elemDescription: `DeFi position: ${positionName}`,
        });
        return;
      } catch (e) {
        if (index === 1) throw e;
      }
    }
  }

  async checkContainerIsDisplayed(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'DeFi list container (defi-positions-container)',
    });
  }
}

export default new DefiView();
