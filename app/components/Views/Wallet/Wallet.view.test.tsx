import '../../../../tests/component-view/mocks';
import {
  renderWalletView,
  renderWalletViewWithRoutes,
} from '../../../../tests/component-view/renderers/wallet';
import { WalletViewSelectorsIDs } from './WalletView.testIds';
import { describeForPlatforms } from '../../../util/test/platform';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';

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
      getByTestId(WalletViewSelectorsIDs.WALLET_SAFE_AREA),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_HEADER_ROOT),
    ).toBeOnTheScreen();
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

  it('navigates to QR tab when scan button is pressed', async () => {
    const { getByTestId, findByTestId } = renderWalletViewWithRoutes({
      extraRoutes: [
        { name: Routes.QR_TAB_SWITCHER },
        { name: Routes.SETTINGS_VIEW },
      ],
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

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.WALLET_SCAN_BUTTON));

    expect(
      await findByTestId(`route-${Routes.QR_TAB_SWITCHER}`),
    ).toBeOnTheScreen();
  });

  it('navigates to Settings when hamburger menu button is pressed', async () => {
    const { getByTestId, findByTestId } = renderWalletViewWithRoutes({
      extraRoutes: [
        { name: Routes.QR_TAB_SWITCHER },
        { name: Routes.SETTINGS_VIEW },
      ],
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

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON),
    );

    expect(
      await findByTestId(`route-${Routes.SETTINGS_VIEW}`),
    ).toBeOnTheScreen();
  });

  const defaultWalletOverrides = {
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
  };

  it('displays navbar address copy button', () => {
    const { getByTestId } = renderWalletView(defaultWalletOverrides);

    expect(
      getByTestId(WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON),
    ).toBeOnTheScreen();
  });

  it('displays account picker in header', () => {
    const { getByTestId } = renderWalletView(defaultWalletOverrides);

    expect(getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON)).toBeOnTheScreen();
  });

  it('address copy button is pressable', () => {
    const { getByTestId } = renderWalletView(defaultWalletOverrides);

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON),
    );
  });
});
