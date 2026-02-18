import '../../../util/test/component-view/mocks';
import { renderWalletActionsView } from '../../../util/test/component-view/renderers/walletActions';
import { WalletActionsBottomSheetSelectorsIDs } from './WalletActionsBottomSheet.testIds';
import { describeForPlatforms } from '../../../util/test/platform';

// Regression: #24972 – Perps missing from Trade menu when non-EVM network selected
describeForPlatforms('WalletActions', () => {
  it('shows Perps button when non-EVM network is selected', () => {
    const { getByTestId } = renderWalletActionsView({
      isEvmSelected: false,
    });

    expect(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.PERPS_BUTTON),
    ).toBeOnTheScreen();
  });
});
