import { KeypadTestIds } from '../../../../../app/components/Base/Keypad/Keypad.testIds';
import { BridgeViewSelectorsIDs } from '../../../../../app/components/UI/Bridge/Views/BridgeView/BridgeView.testIds';
import { getTokenSelectorItemTestId } from '../../../../../app/components/UI/Bridge/components/TokenSelectorItem.testIds';
import { HomepageActionButtonsGridTestIds } from '../../../../../app/components/Views/Homepage/components/HomepageActionButtonsGrid/HomepageActionButtonsGrid.testIds';

export const SCENARIO_001_LOCATORS = {
  openSwaps: HomepageActionButtonsGridTestIds.SWAP_BUTTON,
  sourceTokenSelector: BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA,
  sourceAmountInput: BridgeViewSelectorsIDs.SOURCE_TOKEN_INPUT,
  destinationTokenSelector: BridgeViewSelectorsIDs.DESTINATION_TOKEN_AREA,
  destinationAmountInput: BridgeViewSelectorsIDs.DESTINATION_TOKEN_INPUT,
  ethereumUsdc: getTokenSelectorItemTestId('0x1', 'USDC'),
  keypadDelete: KeypadTestIds.DELETE,
  keypadDigitOne: KeypadTestIds.DIGIT_ONE,
} as const;
