import '../../../util/test/integration/mocks';
import { renderWalletView } from '../../../util/test/integration/renderers/wallet';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { describeForPlatforms } from '../../../util/test/platform';

describeForPlatforms('Wallet (background-only integration)', () => {
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

    expect(getByTestId(WalletViewSelectorsIDs.WALLET_CONTAINER)).toBeTruthy();
    expect(getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT)).toBeTruthy();
    expect(getByTestId(WalletViewSelectorsIDs.WALLET_SEND_BUTTON)).toBeTruthy();
  });
});
