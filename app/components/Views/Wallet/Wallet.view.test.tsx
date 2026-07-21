import '../../../../tests/component-view/mocks';
import {
  renderWalletView,
  renderWalletViewWithRoutes,
} from '../../../../tests/component-view/renderers/wallet';
import { initialStateWallet } from '../../../../tests/component-view/presets/wallet';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import { WalletViewSelectorsIDs } from './WalletView.testIds';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import Wallet from './index';
import React from 'react';

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
            PreferencesController: {
              tokenSortConfig: {
                key: 'tokenFiatAmount',
                order: 'dsc',
                sortCallback: 'stringNumeric',
              },
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
      getByTestId(WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      getByTestId(WalletViewSelectorsIDs.WALLET_SEND_BUTTON),
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
            PreferencesController: {
              tokenSortConfig: {
                key: 'tokenFiatAmount',
                order: 'dsc',
                sortCallback: 'stringNumeric',
              },
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
          PreferencesController: {
            tokenSortConfig: {
              key: 'tokenFiatAmount',
              order: 'dsc',
              sortCallback: 'stringNumeric',
            },
          },
        },
      },
    } as unknown as Record<string, unknown>,
  };

  it('navbar address copy button is visible and pressable', () => {
    const { getByTestId } = renderWalletView(defaultWalletOverrides);

    const addressCopyButton = getByTestId(
      WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON,
    );
    expect(addressCopyButton).toBeOnTheScreen();
    fireEvent.press(addressCopyButton);
  });

  it('account picker in header is pressable', () => {
    const { getByTestId } = renderWalletView(defaultWalletOverrides);

    const accountPicker = getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON);
    expect(accountPicker).toBeOnTheScreen();
    fireEvent.press(accountPicker);
  });

  const walletStateOverrides = {
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
        PreferencesController: {
          tokenSortConfig: {
            key: 'tokenFiatAmount',
            order: 'dsc',
            sortCallback: 'stringNumeric',
          },
        },
      },
    },
  };

  const renderWalletWithState = (
    configure: (
      builder: ReturnType<typeof initialStateWallet>,
    ) => ReturnType<typeof initialStateWallet>,
  ) => {
    const state = configure(initialStateWallet()).build();

    return renderComponentViewScreen(
      Wallet as unknown as React.ComponentType,
      { name: Routes.WALLET_VIEW },
      { state },
    );
  };

  describe('card header button', () => {
    it('hides the card button when the Money account is visible', () => {
      const { queryByTestId } = renderWalletWithState((builder) =>
        builder
          .withRemoteFeatureFlags({
            moneyEnableMoneyAccount: {
              enabled: true,
              minimumVersion: '0.0.0',
            },
            moneyAccountGeoBlockedCountries: { blockedRegions: ['GB'] },
          })
          .withOverrides({
            ...walletStateOverrides,
            engine: {
              backgroundState: {
                ...walletStateOverrides.engine.backgroundState,
                GeolocationController: {
                  location: 'US',
                },
              },
            },
          } as unknown as Record<string, unknown>),
      );

      expect(
        queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('shows the card button when Money account is disabled', () => {
      const { getByTestId } = renderWalletView(defaultWalletOverrides);

      expect(getByTestId(WalletViewSelectorsIDs.CARD_BUTTON)).toBeOnTheScreen();
    });

    it('shows the card button when Money account is enabled but geo-ineligible', () => {
      const { getByTestId } = renderWalletWithState((builder) =>
        builder
          .withRemoteFeatureFlags({
            moneyEnableMoneyAccount: {
              enabled: true,
              minimumVersion: '0.0.0',
            },
            moneyAccountGeoBlockedCountries: { blockedRegions: ['GB'] },
          })
          .withOverrides({
            ...walletStateOverrides,
            engine: {
              backgroundState: {
                ...walletStateOverrides.engine.backgroundState,
                GeolocationController: {
                  location: 'GB',
                },
              },
            },
          } as unknown as Record<string, unknown>),
      );

      expect(getByTestId(WalletViewSelectorsIDs.CARD_BUTTON)).toBeOnTheScreen();
    });
  });
});
