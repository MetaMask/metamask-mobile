import '../../../../tests/component-view/mocks';
import { renderWalletActionsView } from '../../../../tests/component-view/renderers/walletActions';
import { WalletActionsBottomSheetSelectorsIDs } from './WalletActionsBottomSheet.testIds';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { fireEvent } from '@testing-library/react-native';
import {
  renderScreenWithRoutes,
  getRouteProbeTestId,
} from '../../../../tests/component-view/render';
import Routes from '../../../constants/navigation/Routes';
import { initialStateWalletActions } from '../../../../tests/component-view/presets/walletActions';
import WalletActions from '.';

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

  // Migrated from tests/smoke/swap/unified-ui-wallet-actions.spec.ts
  // E2E: 'should display wallet actions bottom sheet when tapping actions button'
  //      'should navigate when tapping swap button from wallet actions'
  // The getByTestId call implicitly asserts the swap button is present; pressing
  // it and waiting for the Bridge route covers both E2E scenarios in one test.
  it('shows swap button for EVM account and navigates to bridge view when pressed', async () => {
    const state = initialStateWalletActions({
      isEvmSelected: true,
    }).build() as unknown as Record<string, unknown>;

    const { getByTestId, findByTestId } = renderScreenWithRoutes(
      WalletActions as unknown as React.ComponentType,
      { name: Routes.MODAL.WALLET_ACTIONS },
      [{ name: Routes.BRIDGE.ROOT }],
      { state },
    );

    fireEvent.press(
      getByTestId(WalletActionsBottomSheetSelectorsIDs.SWAP_BUTTON),
    );

    expect(
      await findByTestId(getRouteProbeTestId(Routes.BRIDGE.ROOT)),
    ).toBeOnTheScreen();
  });
});
