import '../../../../tests/component-view/mocks';
import React from 'react';
import Braze, {
  type Banner,
  type BannerCardsUpdatedEvent,
} from '@braze/react-native-sdk';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NetInfo from '@react-native-community/netinfo';
import { PerpsMode } from '@metamask/perps-controller';
import {
  renderWalletHomepageSearch,
  renderWalletView,
  renderWalletViewWithRoutes,
} from '../../../../tests/component-view/renderers/wallet';
import type NetInfoMock from '../../../__mocks__/@react-native-community/netinfo';
// Wallet home renders this Homepage section. The title test id is owned there.
// eslint-disable-next-line import-x/no-restricted-paths
import { homepageSectionTitleTestId } from '../Homepage/Homepage.testIds';
// eslint-disable-next-line import-x/no-restricted-paths
import { HomeSectionNames } from '../Homepage/hooks/useHomeViewedEvent';
import {
  PERPS_HEADER_AB_TEST_KEY,
  PerpsHeaderNavVariant,
} from '../../UI/Perps/abTestConfig';
import { PERPS_SECTION_HEADER_BUTTON_LOCATION } from '../../UI/Perps/utils/perpsHeaderEntryNavigation';
import { initialStateWallet } from '../../../../tests/component-view/presets/wallet';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderComponentViewScreen,
} from '../../../../tests/component-view/render';
import { WalletViewSelectorsIDs } from './WalletView.testIds';
import { MoneyBalanceCardTestIds } from '../../UI/Money/components/MoneyBalanceCard/MoneyBalanceCard.testIds';
import { BRAZE_BANNER_TEST_IDS } from '../../UI/BrazeBanner/BrazeBanner.testIds';
import { BRAZE_BANNER_WALLET_HOME_PLACEMENT_ID } from '../../../core/Braze/constants';
import { WalletHomeOnboardingStepsSelectors } from '../../UI/WalletHomeOnboardingSteps/WalletHomeOnboardingSteps.testIds';
import { walletHomeOnboardingVisibleSteps } from '../../UI/WalletHomeOnboardingSteps/walletHomeOnboardingStepsModel';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Routes from '../../../constants/navigation/Routes';
import ClipboardManager from '../../../core/ClipboardManager';
// eslint-disable-next-line import-x/no-restricted-paths -- test-only reset for the homepage paste module state
import { resetHomepageSearchPasteStateForTests } from '../TrendingView/search/useHomepageSearchPaste';
import {
  clearTrendingApiMocks,
  mockRwaTokensData,
  mockTrendingTokensData,
  setupTrendingApiFetchMock,
} from '../../../../tests/component-view/api-mocking/trending';
import { createMockRouteMessenger } from '../../../util/test/mock-route-messenger';
import { strings } from '../../../../locales/i18n';
import Wallet from './index';
import StorageWrapper from '../../../store/storage-wrapper';
import { PERPS_GTM_MODAL_SHOWN } from '../../../constants/storage';
import { setBasicFunctionality } from '../../../actions/settings';

const PASTED_ADDRESS = '0x1111111111111111111111111111111111111111';
// Kept local so this Wallet view test does not import the Trending route module.
const HOMEPAGE_SEARCH_AB_KEY = 'homeTMCU1384AbtestHomepageSearch';
const RootModalStack = createNativeStackNavigator();

const RootModalFlowStack = () => (
  <RootModalStack.Navigator>
    <RootModalStack.Screen
      name={Routes.SHEET.EXPERIENCE_ENHANCER}
      component={createRouteParamsProbe(Routes.SHEET.EXPERIENCE_ENHANCER)}
    />
  </RootModalStack.Navigator>
);

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

const restoreHomepageSearchClipboard = () => {
  jest.mocked(Clipboard.hasString).mockReset();
  jest
    .mocked(Clipboard.hasString)
    .mockImplementation(() => Promise.resolve(false));
  jest.mocked(Clipboard.getString).mockReset();
  jest
    .mocked(Clipboard.getString)
    .mockImplementation(() => Promise.resolve(''));
  jest.mocked(Clipboard.setString).mockReset();
  resetHomepageSearchPasteStateForTests();
};

describeForPlatforms('Wallet', () => {
  beforeEach(() => {
    // Clipboard mocks and consumed paste revisions are module singletons
    // shared by the iOS and Android suites in this file.
    restoreHomepageSearchClipboard();
  });

  afterEach(() => {
    restoreHomepageSearchClipboard();
  });

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
      getByTestId(WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER),
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

  it('prompts social-login users for marketing consent when no choice is saved', async () => {
    const { findByTestId } = renderWalletViewWithRoutes({
      extraRoutes: [
        {
          name: Routes.MODAL.ROOT_MODAL_FLOW,
          Component: RootModalFlowStack,
        },
      ],
      overrides: {
        security: {
          dataCollectionForMarketing: null,
          isNFTAutoDetectionModalViewed: true,
        },
        engine: {
          backgroundState: {
            AnalyticsController: {
              optedIn: true,
            },
            SeedlessOnboardingController: {
              vault: 'restored-social-login-vault',
            },
          },
        },
      },
    });

    expect(
      await findByTestId(
        getRouteParamsProbeTestId(Routes.SHEET.EXPERIENCE_ENHANCER),
      ),
    ).toBeOnTheScreen();
  });

  it('prompts for marketing consent when no choice is saved, even with MetaMetrics off', async () => {
    const { findByTestId } = renderWalletViewWithRoutes({
      extraRoutes: [
        {
          name: Routes.MODAL.ROOT_MODAL_FLOW,
          Component: RootModalFlowStack,
        },
      ],
      overrides: {
        security: {
          dataCollectionForMarketing: null,
          isNFTAutoDetectionModalViewed: true,
        },
        engine: {
          backgroundState: {
            AnalyticsController: {
              optedIn: false,
            },
          },
        },
      },
    });

    expect(
      await findByTestId(
        getRouteParamsProbeTestId(Routes.SHEET.EXPERIENCE_ENHANCER),
      ),
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
    let resolveHasString: (hasClipboardString: boolean) => void = () =>
      undefined;
    const hasString = new Promise<boolean>((resolve) => {
      resolveHasString = resolve;
    });
    jest.mocked(Clipboard.hasString).mockReturnValue(hasString);

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

    await act(async () => {
      resolveHasString(false);
      await hasString;
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

  describe('Braze growth banner', () => {
    const WALLET1_ENTROPY_ID = 'wallet1';
    const CANONICAL_PROFILE_ID = 'canonical-profile-1';

    type BannerCardsUpdatedListener = (event: BannerCardsUpdatedEvent) => void;

    const walletHomeBrazeBannerEvent = (): BannerCardsUpdatedEvent => ({
      banners: [
        {
          trackingId: 'braze-banner-tracking-1',
          placementId: BRAZE_BANNER_WALLET_HOME_PLACEMENT_ID,
          stableKey: 'braze-banner-stable-key-1',
          isTestSend: false,
          isControl: false,
          html: '',
          expiresAt: -1,
          properties: {
            body: { type: 'string', value: 'Growth banner body' },
            campaign_name: { type: 'string', value: 'Wallet home campaign' },
          },
        } as unknown as Banner,
      ],
    });

    const primaryHdKeyringOverrides = {
      engine: {
        backgroundState: {
          KeyringController: {
            keyrings: [
              {
                accounts: ['0x0000000000000000000000000000000000000001'],
                type: 'HD Key Tree',
                metadata: { id: WALLET1_ENTROPY_ID, name: 'Wallet 1' },
              },
            ],
          },
        },
      },
    };

    const canonicalProfileOverrides = {
      engine: {
        backgroundState: {
          AuthenticationController: {
            srpSessionData: {
              [WALLET1_ENTROPY_ID]: {
                profile: { canonicalProfileId: CANONICAL_PROFILE_ID },
              },
            },
          },
        },
      },
    };

    const fundedBalanceOverrides = {
      engine: {
        backgroundState: {
          AssetsController: {
            assetsBalance: {
              'acc-1': {
                'eip155:1/slip44:60': { amount: '1.5' },
              },
            },
          },
        },
      },
    };

    const onboardingChecklistOverrides = (stepIndex: number) => ({
      onboarding: {
        completedOnboarding: true,
        walletHomeOnboardingStepsEligible: true,
        walletHomeOnboardingSkipInitialBalanceWait: true,
        walletHomeOnboardingSteps: { suppressedReason: null, stepIndex },
      },
    });

    const renderGrowthBannerWallet = (
      options: {
        hasCanonicalProfile?: boolean;
        checklistStep?: number;
        funded?: boolean;
      } = {},
    ) => {
      const {
        hasCanonicalProfile = true,
        checklistStep,
        funded = false,
      } = options;
      return renderComponentViewScreen(
        Wallet as unknown as React.ComponentType,
        { name: Routes.WALLET_VIEW },
        {
          state: initialStateWallet({ deterministicFiat: true })
            .withRemoteFeatureFlags({
              brazeBannerHomeMinVersion: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              carouselBanners: true,
            })
            .withOverrides({
              engine: {
                backgroundState: {
                  ...primaryHdKeyringOverrides.engine.backgroundState,
                  ...(hasCanonicalProfile
                    ? canonicalProfileOverrides.engine.backgroundState
                    : {}),
                  ...(funded
                    ? fundedBalanceOverrides.engine.backgroundState
                    : {}),
                },
              },
              ...(checklistStep !== undefined
                ? onboardingChecklistOverrides(checklistStep)
                : {}),
            } as unknown as Record<string, unknown>)
            .build(),
          routeMessenger: createMockRouteMessenger(),
        },
      );
    };

    const brazeAddListener = () =>
      Braze.addListener as unknown as jest.Mock<
        { remove: () => void },
        [event: string, callback: BannerCardsUpdatedListener]
      >;

    const bannerCardsUpdatedRegistrations = () =>
      brazeAddListener().mock.calls.filter(
        ([event]) => event === 'bannerCardsUpdated',
      );

    const emitWalletHomeBrazeBanner = () => {
      const listener = bannerCardsUpdatedRegistrations().at(-1)?.[1];
      if (!listener) {
        throw new Error(
          'BrazeBanner never registered the bannerCardsUpdated listener',
        );
      }
      act(() => {
        listener(walletHomeBrazeBannerEvent());
      });
    };

    beforeEach(() => {
      brazeAddListener().mockClear();
    });

    it('renders the Braze banner instead of the carousel when both growth flags are enabled', async () => {
      const { findByTestId, queryByTestId } = renderGrowthBannerWallet();

      await waitFor(() => {
        expect(bannerCardsUpdatedRegistrations()).not.toHaveLength(0);
      });
      emitWalletHomeBrazeBanner();

      expect(
        await findByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.CAROUSEL_CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders no growth banner while the canonical profile ID is missing', async () => {
      const { findByTestId, queryByTestId } = renderGrowthBannerWallet({
        hasCanonicalProfile: false,
      });

      expect(
        await findByTestId(WalletViewSelectorsIDs.WALLET_CONTAINER),
      ).toBeOnTheScreen();

      expect(
        queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(bannerCardsUpdatedRegistrations()).toHaveLength(0);
    });

    it('keeps the Braze banner hidden for an unfunded wallet during the fund step', async () => {
      const { findByTestId, queryByTestId } = renderGrowthBannerWallet({
        checklistStep: 0,
      });

      expect(
        await findByTestId(WalletHomeOnboardingStepsSelectors.PROGRESS_LABEL),
      ).toBeOnTheScreen();

      expect(
        queryByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(bannerCardsUpdatedRegistrations()).toHaveLength(0);
    });

    it('renders the Braze banner on a funded wallet once the checklist is past the fund step', async () => {
      const { findByTestId } = renderGrowthBannerWallet({
        checklistStep: 1,
        funded: true,
      });

      expect(
        await findByTestId(WalletHomeOnboardingStepsSelectors.PROGRESS_LABEL),
      ).toBeOnTheScreen();
      emitWalletHomeBrazeBanner();

      expect(
        await findByTestId(BRAZE_BANNER_TEST_IDS.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('Perps section header market list', () => {
    const NestedStack = createNativeStackNavigator();
    const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

    const PerpsRoot = () => (
      <NestedStack.Navigator>
        <NestedStack.Screen
          name={Routes.PERPS.MARKET_LIST}
          component={createRouteParamsProbe(Routes.PERPS.MARKET_LIST)}
        />
      </NestedStack.Navigator>
    );

    afterEach(() => {
      netInfoMock.__resetMockNetInfo();
    });

    it('lands a Pro treatment user on the market list from the section header', async () => {
      netInfoMock.__setMockNetInfo({
        type: 'wifi',
        isInternetReachable: true,
      });

      const { findByTestId } = renderWalletViewWithRoutes({
        extraRoutes: [
          {
            name: Routes.PERPS.ROOT,
            Component: PerpsRoot as unknown as React.ComponentType<unknown>,
          },
        ],
        overrides: {
          settings: {
            basicFunctionalityEnabled: true,
          },
          engine: {
            backgroundState: {
              EarnController: {
                pooled_staking: { isEligible: false },
                lending: { positions: [], markets: [] },
              },
              PerpsController: {
                isEligible: true,
                initializationState: 'initialized',
                isTestnet: false,
                isFirstTimeUser: { mainnet: false, testnet: false },
                mode: PerpsMode.Pro,
                watchlistMarkets: { testnet: [], mainnet: ['ETH'] },
              },
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  perpsProModeEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  perpsWatchlistV2Enabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  [PERPS_HEADER_AB_TEST_KEY]: PerpsHeaderNavVariant.Treatment,
                },
              },
            },
          },
        } as unknown as Record<string, unknown>,
      });

      fireEvent.press(
        await findByTestId(
          homepageSectionTitleTestId(HomeSectionNames.PERPS),
          {},
          { timeout: 10000 },
        ),
      );

      const probe = await findByTestId(
        getRouteParamsProbeTestId(Routes.PERPS.MARKET_LIST),
        {},
        { timeout: 10000 },
      );

      expect(JSON.parse(String(probe.props.children))).toEqual(
        expect.objectContaining({
          showWatchlistOnly: true,
          button_location: PERPS_SECTION_HEADER_BUTTON_LOCATION,
        }),
      );
    });
  });

  describe('Perps onboarding entry', () => {
    const PerpsModalsStack = () => (
      <RootModalStack.Navigator>
        <RootModalStack.Screen
          name={Routes.PERPS.MODALS.GTM_MODAL}
          component={createRouteParamsProbe(Routes.PERPS.MODALS.GTM_MODAL)}
        />
      </RootModalStack.Navigator>
    );
    const gtmProbeTestId = getRouteParamsProbeTestId(
      Routes.PERPS.MODALS.GTM_MODAL,
    );
    const originalPerpsEnabled = process.env.MM_PERPS_ENABLED;
    const originalGtmModalEnabled = process.env.MM_PERPS_GTM_MODAL_ENABLED;

    const renderForNewPerpsUser = (basicFunctionalityEnabled: boolean) =>
      renderWalletViewWithRoutes({
        extraRoutes: [
          { name: Routes.PERPS.MODALS.ROOT, Component: PerpsModalsStack },
        ],
        overrides: {
          settings: { basicFunctionalityEnabled },
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  perpsPerpTradingEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  perpsPerpGtmOnboardingModalEnabled: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                },
              },
            },
          },
        },
      });

    beforeEach(async () => {
      // With basic functionality off, remote flags are ignored and the Perps
      // flags fall back to these build-time values.
      process.env.MM_PERPS_ENABLED = 'true';
      process.env.MM_PERPS_GTM_MODAL_ENABLED = 'true';
      await StorageWrapper.removeItem(PERPS_GTM_MODAL_SHOWN);
    });

    afterEach(() => {
      const restore = (key: string, value: string | undefined) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      };
      restore('MM_PERPS_ENABLED', originalPerpsEnabled);
      restore('MM_PERPS_GTM_MODAL_ENABLED', originalGtmModalEnabled);
    });

    it('opens Perps onboarding for a new user when basic functionality is on', async () => {
      const { findByTestId } = renderForNewPerpsUser(true);

      expect(await findByTestId(gtmProbeTestId)).toBeOnTheScreen();
    });

    it('keeps the wallet free of Perps onboarding while basic functionality is off, then opens it once turned back on', async () => {
      const getItemSpy = jest.spyOn(StorageWrapper, 'getItem');
      const { findByTestId, queryByTestId, store } =
        renderForNewPerpsUser(false);

      expect(
        await findByTestId(WalletViewSelectorsIDs.WALLET_CONTAINER),
      ).toBeOnTheScreen();
      expect(getItemSpy).not.toHaveBeenCalledWith(PERPS_GTM_MODAL_SHOWN);
      expect(queryByTestId(gtmProbeTestId)).toBeNull();
      getItemSpy.mockRestore();

      act(() => {
        store.dispatch(setBasicFunctionality(true));
      });

      expect(await findByTestId(gtmProbeTestId)).toBeOnTheScreen();
    });
  });
});
