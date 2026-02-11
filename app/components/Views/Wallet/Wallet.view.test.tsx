import '../../../util/test/component-view/mocks';
import { renderWalletView } from '../../../util/test/component-view/renderers/wallet';
import { WalletViewSelectorsIDs } from './WalletView.testIds';
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

    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_SEND_BUTTON),
    ).toBeOnTheScreen();
  });
});
