import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';

/** testID from DeFiProtocolPositionDetails - avoid importing the component (pulls in react-native) */
const DEFI_POSITION_DETAILS_BALANCE_TEST_ID =
  'defi_protocol_position_details_balance';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

/**
 * Page Object for the DeFi position details screen (e.g. "Aave V3").
 * Covers the view shown after tapping a position from the DeFi list:
 * protocol title, total value, back button, and asset sections (Supplied, Borrowed, etc.)
 * with individual token rows (symbol, fiat value, balance).
 */
class DefiPositionView {
  /** Main container of the position details screen */
  get container(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER,
    );
  }

  /** Back arrow button in the navbar (navigates to DeFi list) */
  get backButton(): DetoxElement {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  /** Total balance/value for the position (e.g. "$14.74") */
  get totalBalance(): DetoxElement {
    return Matchers.getElementByID(DEFI_POSITION_DETAILS_BALANCE_TEST_ID);
  }

  /**
   * Protocol title element (e.g. "Aave V3", "Uniswap V3").
   * Use for visibility assertions; title text is dynamic.
   */
  getProtocolTitleElement(protocolName: string): DetoxElement {
    return Matchers.getElementByText(protocolName);
  }

  /**
   * Section headers for position types. Assumes English locale.
   * Keys match defi_positions i18n: supply → "Supplied", stake → "Staked", etc.
   */
  get suppliedSectionHeader(): DetoxElement {
    return Matchers.getElementByText('Supplied');
  }

  get stakedSectionHeader(): DetoxElement {
    return Matchers.getElementByText('Staked');
  }

  get borrowedSectionHeader(): DetoxElement {
    return Matchers.getElementByText('Borrowed');
  }

  get rewardsSectionHeader(): DetoxElement {
    return Matchers.getElementByText('Rewards');
  }

  /**
   * Element for an asset row by symbol (e.g. "USDT", "WETH").
   * Use for visibility assertions or to locate the row.
   */
  getAssetSymbolElement(symbol: string): DetoxElement {
    return Matchers.getElementByText(symbol);
  }

  /**
   * Asserts that the position details screen is displayed:
   * main container and back button are visible.
   */
  async checkContainersIsDisplayed(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'DeFi position details container should be visible',
    });
    await Assertions.expectElementToBeVisible(this.backButton, {
      description: 'DeFi position details back button should be visible',
    });
  }

  async tapBack(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'DeFi position details back button',
    });
  }
}

export default new DefiPositionView();
