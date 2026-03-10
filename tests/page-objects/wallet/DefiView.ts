import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import Gestures from '../../framework/Gestures';

/** testID from DeFiProtocolPositionDetails - avoid importing the component (pulls in react-native) */
const DEFI_POSITION_DETAILS_BALANCE_TEST_ID =
  'defi_protocol_position_details_balance';
import Matchers from '../../framework/Matchers';
import { Assertions } from '../../framework';

/**
 * Page Object for the DeFi full view screen.
 * Covers the screen shown after navigating to DeFi (from Homepage section or wallet tab):
 * header with back button, network filter, and list of DeFi positions.
 * Also supports the position details view when a position is opened.
 */
class DefiView {
  /** Main container wrapping the DeFi positions list and control bar */
  get container(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_CONTAINER,
    );
  }

  /** Back button in the header (navigates to previous screen) */
  get backButton(): DetoxElement {
    return Matchers.getElementByID('back-button');
  }

  /** Network filter button ("Popular networks" with chevron) */
  get networkFilter(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_NETWORK_FILTER,
    );
  }

  /** View containing the list of DeFi position rows */
  get positionsList(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.DEFI_POSITIONS_LIST);
  }

  /** Scroll view containing the positions (for scrollToElement) */
  get scrollViewIdentifier(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier(
      WalletViewSelectorsIDs.DEFI_POSITIONS_SCROLL_VIEW,
    );
  }

  /** Container of the position details screen (after tapping a position) */
  get positionDetailsContainer(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER,
    );
  }

  /** Balance text in the position details screen */
  get positionDetailsBalance(): DetoxElement {
    return Matchers.getElementByID(DEFI_POSITION_DETAILS_BALANCE_TEST_ID);
  }

  async tapBack(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'DeFi screen back button',
    });
  }

  async tapNetworkFilter(): Promise<void> {
    await Gestures.waitAndTap(this.networkFilter, {
      elemDescription: 'DeFi networks filter',
    });
  }

  /**
   * Taps a DeFi position row by its visible name (e.g. "Aave V3", "Uniswap V3").
   * Waits for the DeFi container first, then taps the position row.
   * Uses atIndex(0) to handle duplicates from the homepage navigation stack.
   */
  async tapPosition(positionName: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Wait for DeFi container before tapping position',
    });
    const index = device.getPlatform() === 'ios' ? 1 : 0;
    const elem = Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITION_LIST_ITEM(positionName),
      index,
    );
    await Gestures.waitAndTap(elem, {
      checkVisibility: false,
      elemDescription: `DeFi position: ${positionName}`,
    });
  }

  async checkContainerIsDisplayed(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'DeFi list container (defi-positions-container)',
    });
  }
}

export default new DefiView();
