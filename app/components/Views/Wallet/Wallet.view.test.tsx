import '../../../util/test/component-view/mocks';
import { renderWalletView } from '../../../util/test/component-view/renderers/wallet';
import {
  WALLET_VIEW_CONTAINER_ID,
  WALLET_TOTAL_BALANCE_TEXT_ID,
  WALLET_SEND_BUTTON_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { describeForPlatforms } from '../../../util/test/platform';

describeForPlatforms('Wallet', () => {
  it('renders wallet home with minimal state and shows key UI elements', () => {
    const { getByTestId } = renderWalletView({
      overrides: {
        settings: {
          basicFunctionalityEnabled: true,
        },
        engine: {
          backgroundState: {
            MultichainNetworkController: {
              isEvmSelected: true,
            },
            RewardsController: {
              activeAccount: null,
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    expect(getByTestId(WALLET_VIEW_CONTAINER_ID)).toBeOnTheScreen();
    expect(getByTestId(WALLET_TOTAL_BALANCE_TEXT_ID)).toBeOnTheScreen();
    expect(getByTestId(WALLET_SEND_BUTTON_ID)).toBeOnTheScreen();
  });
});
