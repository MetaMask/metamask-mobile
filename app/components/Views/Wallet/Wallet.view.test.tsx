import '../../../../tests/component-view/mocks';
import {
  renderWalletHomepageSearch,
  renderWalletView,
  renderWalletViewWithRoutes,
} from '../../../../tests/component-view/renderers/wallet';
import { initialStateWallet } from '../../../../tests/component-view/presets/wallet';
import { renderComponentViewScreen } from '../../../../tests/component-view/render';
import { WalletViewSelectorsIDs } from './WalletView.testIds';
import { MoneyBalanceCardTestIds } from '../../UI/Money/components/MoneyBalanceCard/MoneyBalanceCard.testIds';
import { WalletHomeOnboardingStepsSelectors } from '../../UI/WalletHomeOnboardingSteps/WalletHomeOnboardingSteps.testIds';
import { walletHomeOnboardingVisibleSteps } from '../../UI/WalletHomeOnboardingSteps/walletHomeOnboardingStepsModel';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Routes from '../../../constants/navigation/Routes';
import ClipboardManager from '../../../core/ClipboardManager';
import {
  clearTrendingApiMocks,
  mockRwaTokensData,
  mockTrendingTokensData,
  setupTrendingApiFetchMock,
} from '../../../../tests/component-view/api-mocking/trending';
import { createMockRouteMessenger } from '../../../util/test/mock-route-messenger';
import { strings } from '../../../../locales/i18n';
import Wallet from './index';
import React from 'react';

const PASTED_ADDRESS = '0x1111111111111111111111111111111111111111';
// Kept local so this Wallet view test does not import the Trending route module.
const HOMEPAGE_SEARCH_AB_KEY = 'homeTMCU1384AbtestHomepageSearch';

const walletHomeOverrides = (variant?: 'control' | 'treatment') => ({
  overrides: {
    settings: {
      basicFunctionalityEnabled: true,
    },
    engine: {
      backgroundState: {
        MultichainNetworkController: {
          isEvmSelected: true,
        },
        EarnController: {
          pooled_staking: { isEligible: false },
          lending: { positions: [], markets: [] },
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
        ...(variant
          ? {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  [HOMEPAGE_SEARCH_AB_KEY]: variant,
                },
              },
            }
          : {}),
      },
    },
  } as unknown as Record<string, unknown>,
});

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
            EarnController: {
              pooled_staking: { isEligible: false },
              lending: { positions: [], markets: [] },
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
            EarnController: {
              pooled_staking: { isEligible: false },
              lending: { positions: [], markets: [] },
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

  it('opens Explore search from the control header without a paste action', async () => {
    jest.mocked(Clipboard.hasString).mockResolvedValue(true);

    const { getByTestId, findByTestId, queryByTestId } =
      renderWalletViewWithRoutes({
        extraRoutes: [{ name: Routes.EXPLORE_SEARCH }],
        ...walletHomeOverrides('control'),
      });

    const searchButton = getByTestId(
      WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON,
    );

    expect(searchButton).toHaveAccessibleName(
      strings('wallet.search_accessibility_label'),
    );
    expect(
      queryByTestId(WalletViewSelectorsIDs.HOMEPAGE_SEARCH_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WalletViewSelectorsIDs.HOMEPAGE_SEARCH_CLIPBOARD_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(searchButton);

    expect(
      await findByTestId(`route-${Routes.EXPLORE_SEARCH}`),
    ).toBeOnTheScreen();
    expect(Clipboard.hasString).not.toHaveBeenCalled();
  });

  it('opens Explore search from the treatment header when the clipboard is empty', async () => {
    jest.mocked(Clipboard.hasString).mockResolvedValue(false);

    const { getByTestId, findByTestId, queryByTestId } =
      renderWalletViewWithRoutes({
        extraRoutes: [{ name: Routes.EXPLORE_SEARCH }],
        ...walletHomeOverrides('treatment'),
      });

    const searchButton = getByTestId(
      WalletViewSelectorsIDs.HOMEPAGE_SEARCH_BUTTON,
    );

    await waitFor(() => {
      expect(Clipboard.hasString).toHaveBeenCalled();
    });

    expect(
      queryByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(WalletViewSelectorsIDs.HOMEPAGE_SEARCH_CLIPBOARD_BUTTON),
    ).not.toBeOnTheScreen();
    expect(searchButton).toHaveAccessibleName(
      strings('wallet.homepage_search_placeholder'),
    );

    fireEvent.press(searchButton);

    expect(
      await findByTestId(`route-${Routes.EXPLORE_SEARCH}`),
    ).toBeOnTheScreen();
  });

  it('pastes the clipboard address into Explore search and loads that result', async () => {
    setupTrendingApiFetchMock(
      mockTrendingTokensData,
      undefined,
      mockRwaTokensData,
      [
        {
          assetId: `eip155:1/erc20:${PASTED_ADDRESS}`,
          name: 'Clipboard Token',
          symbol: 'CLIP',
          decimals: 18,
          price: '1.00',
        },
      ],
    );

    try {
      await ClipboardManager.setString(PASTED_ADDRESS);
      jest.mocked(Clipboard.hasString).mockResolvedValue(true);
      jest.mocked(Clipboard.getString).mockResolvedValue(PASTED_ADDRESS);

      const { findByTestId, findByText, findByDisplayValue, queryByTestId } =
        renderWalletHomepageSearch(walletHomeOverrides('treatment'));

      fireEvent.press(
        await findByTestId(
          WalletViewSelectorsIDs.HOMEPAGE_SEARCH_CLIPBOARD_BUTTON,
        ),
      );

      expect(await findByDisplayValue(PASTED_ADDRESS)).toBeOnTheScreen();
      expect(await findByText('Clipboard Token')).toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.HOMEPAGE_SEARCH_CLIPBOARD_BUTTON),
      ).not.toBeOnTheScreen();
    } finally {
      clearTrendingApiMocks();
    }
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
          EarnController: {
            pooled_staking: { isEligible: false },
            lending: { positions: [], markets: [] },
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

  it('opens the account selector when the account picker is pressed', async () => {
    const { getByTestId, findByTestId } = renderWalletViewWithRoutes({
      extraRoutes: [{ name: Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR }],
      ...defaultWalletOverrides,
    });

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON));

    expect(
      await findByTestId(
        `route-${Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR}`,
      ),
    ).toBeOnTheScreen();
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
        EarnController: {
          pooled_staking: { isEligible: false },
          lending: { positions: [], markets: [] },
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
      { state, routeMessenger: createMockRouteMessenger() },
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

  describe('Money balance card', () => {
    /** Money account enabled + geo-eligible, so only the checklist can hide the card. */
    const renderMoneyAccountVisibleWallet = (
      onboarding: Record<string, unknown>,
    ) =>
      renderWalletWithState((builder) =>
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
            onboarding: {
              completedOnboarding: true,
              walletHomeOnboardingStepsEligible: true,
              walletHomeOnboardingSkipInitialBalanceWait: true,
              ...onboarding,
            },
          } as unknown as Record<string, unknown>),
      );

    it('hides the Money balance card while the onboarding checklist is showing', () => {
      const { getByTestId, queryByTestId } = renderMoneyAccountVisibleWallet({
        walletHomeOnboardingSteps: { suppressedReason: null, stepIndex: 0 },
      });

      expect(
        queryByTestId(MoneyBalanceCardTestIds.LABEL),
      ).not.toBeOnTheScreen();
      expect(
        getByTestId(WalletHomeOnboardingStepsSelectors.PROGRESS_LABEL),
      ).toBeOnTheScreen();
    });

    it('shows the Money balance card after the user skips the last checklist step', () => {
      // This preset leaves `pushNotificationOsPromptRequested` unset, so the notifications
      // step is part of the flow (TMCU-924).
      const lastStepIndex =
        walletHomeOnboardingVisibleSteps({ includeNotificationsStep: true })
          .length - 1;
      const { getByTestId, queryByTestId } = renderMoneyAccountVisibleWallet({
        walletHomeOnboardingSteps: {
          suppressedReason: null,
          stepIndex: lastStepIndex,
        },
      });

      fireEvent.press(
        getByTestId(WalletHomeOnboardingStepsSelectors.SKIP_BUTTON),
      );

      expect(
        queryByTestId(WalletHomeOnboardingStepsSelectors.PROGRESS_LABEL),
      ).not.toBeOnTheScreen();
      expect(getByTestId(MoneyBalanceCardTestIds.LABEL)).toBeOnTheScreen();
    });
  });
});
