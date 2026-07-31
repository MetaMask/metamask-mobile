import React from 'react';
import MainNavigator from './MainNavigator';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialRootState from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';
import { ReactTestInstance } from 'react-test-renderer';
import { mockTheme } from '../../../util/theme';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.72.0'),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: jest.fn().mockReturnValue({
    Navigator: 'Navigator',
    Screen: 'Screen',
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: jest.fn().mockReturnValue({
    Navigator: 'TabNavigator',
    Screen: 'TabScreen',
  }),
}));

// RewardsHome resolves the candidate subscription id for both the dashboard and
// onboarding branches. Mock it so the regression test can assert the call
// without exercising the real async fetch.
const mockUseCandidateSubscriptionId = jest.fn();
jest.mock('../../UI/Rewards/hooks/useCandidateSubscriptionId', () => ({
  useCandidateSubscriptionId: () => mockUseCandidateSubscriptionId(),
}));

const mockSelectPerpsEnabledFlag = jest.fn();
const mockSelectPredictEnabledFlag = jest.fn();
const mockSelectMarketInsightsEnabled = jest.fn();
const mockSelectMarketInsightsPerpsEnabled = jest.fn();

jest.mock('../../UI/Perps', () => ({
  PerpsScreenStack: () => 'PerpsScreenStack',
  PerpsModalStack: () => 'PerpsModalStack',
  PerpsTutorialCarousel: () => 'PerpsTutorialCarousel',
  selectPerpsEnabledFlag: (state: unknown) => mockSelectPerpsEnabledFlag(state),
}));

jest.mock('../../UI/Predict', () => {
  const { Fragment } = jest.requireActual('react');
  return {
    PredictScreenStack: () => 'PredictScreenStack',
    PredictModalStack: () => 'PredictModalStack',
    PredictPreviewSheetProvider: ({
      children,
    }: {
      children: React.ReactNode;
    }) => jest.requireActual('react').createElement(Fragment, null, children),
    selectPredictEnabledFlag: (state: unknown) =>
      mockSelectPredictEnabledFlag(state),
  };
});

jest.mock('../../UI/MarketInsights', () => ({
  MarketInsightsView: () => 'MarketInsightsView',
  selectMarketInsightsEnabled: (state: unknown) =>
    mockSelectMarketInsightsEnabled(state),
}));

jest.mock('../../../selectors/featureFlagController/marketInsights', () => ({
  selectMarketInsightsPerpsEnabled: (state: unknown) =>
    mockSelectMarketInsightsPerpsEnabled(state),
}));

jest.mock('../../UI/Money/Views/MoneyFirstTimeDepositView', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../hooks/useAnalytics/useAnalytics');

jest.mock('../../UI/Money/components/MoneyTabPressTracker', () => ({
  __esModule: true,
  default: () => null,
}));

const mockSelectMoneyEnableMoneyAccountFlag = jest.fn().mockReturnValue(false);
jest.mock('../../UI/Money/selectors/featureFlags', () => ({
  selectMoneyEnableMoneyAccountFlag: (state: unknown) =>
    mockSelectMoneyEnableMoneyAccountFlag(state),
}));

const mockSelectIsMoneyAccountGeoEligible = jest.fn().mockReturnValue(true);
jest.mock('../../UI/Money/selectors/eligibility', () => ({
  selectIsMoneyAccountGeoEligible: (state: unknown) =>
    mockSelectIsMoneyAccountGeoEligible(state),
}));

describe('MainNavigator', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
  });

  describe('Tab Bar Visibility', () => {
    const getHomeTabsComponent = (): React.ComponentType<
      Record<string, unknown>
    > => {
      const { root: mainRoot } = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });
      const homeScreen = mainRoot.findAll(
        (node: ReactTestInstance) =>
          node.type?.toString?.() === 'Screen' && node.props?.name === 'Home',
      )[0];
      return homeScreen?.props?.component;
    };

    const getTabBarFn = (
      HomeTabsComponent: React.ComponentType<Record<string, unknown>>,
    ) => {
      const { root: homeRoot } = renderWithProvider(
        <HomeTabsComponent route={{ params: {} }} />,
        { state: initialRootState },
      );
      const tabNavigatorNode = homeRoot.findAll(
        (node: ReactTestInstance) => node.type?.toString?.() === 'TabNavigator',
      )[0];
      return tabNavigatorNode?.props?.tabBar as (args: {
        state: {
          routes: { name: string; state?: unknown }[];
          index: number;
        };
        descriptors: Record<string, unknown>;
        navigation: Record<string, unknown>;
      }) => React.ReactNode;
    };

    it('hides tab bar when browser is active', () => {
      // Given HomeTabs is rendered and the active route is the browser
      const HomeTabs = getHomeTabsComponent();
      const renderTabBar = getTabBarFn(HomeTabs);

      // When renderTabBar is called with a browser route as the active tab
      const result = renderTabBar({
        state: {
          routes: [{ name: Routes.BROWSER.HOME }],
          index: 0,
        },
        descriptors: {},
        navigation: {},
      });

      // Then the tab bar should be hidden
      expect(result).toBeNull();
    });

    it('shows tab bar when not in browser', () => {
      // Given HomeTabs is rendered and the active route is the wallet
      const HomeTabs = getHomeTabsComponent();
      const renderTabBar = getTabBarFn(HomeTabs);

      // When renderTabBar is called with a non-browser route as the active tab
      const result = renderTabBar({
        state: {
          routes: [{ name: Routes.WALLET.HOME }],
          index: 0,
        },
        descriptors: {},
        navigation: {},
      });

      // Then the tab bar should be visible
      expect(result).not.toBeNull();
    });

    it('sets the wallet tab stack background to the theme background', () => {
      // Given HomeTabs is rendered
      const HomeTabs = getHomeTabsComponent();

      // When the wallet tab stack is rendered
      const { root: homeRoot } = renderWithProvider(
        <HomeTabs route={{ params: {} }} />,
        { state: initialRootState },
      );
      const homeTabScreen = homeRoot.findAll(
        (node: ReactTestInstance) =>
          node.type?.toString?.() === 'TabScreen' &&
          node.props?.name === Routes.WALLET.HOME,
      )[0];
      const WalletTabStack = homeTabScreen?.props?.component;

      const { root: walletRoot } = renderWithProvider(<WalletTabStack />, {
        state: initialRootState,
      });

      const stackNavigator = walletRoot.findAll(
        (node: ReactTestInstance) =>
          node.type?.toString?.() === 'Navigator' &&
          node.props?.initialRouteName === 'WalletView',
      )[0];
      const revealPrivateCredentialScreen = walletRoot.findAll(
        (node: ReactTestInstance) =>
          node.type?.toString?.() === 'Screen' &&
          node.props?.name === Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
      )[0];

      // Then every screen in the wallet tab stack, including pushed screens,
      // inherits the themed content background (native-stack uses contentStyle).
      expect(stackNavigator?.props?.screenOptions).toEqual(
        expect.objectContaining({
          contentStyle: {
            backgroundColor: mockTheme.colors.background.default,
          },
        }),
      );
      expect(revealPrivateCredentialScreen?.props?.options).toEqual(
        expect.objectContaining({
          headerShown: false,
        }),
      );
    });

    describe('Rewards sub-page tab bar visibility', () => {
      // rewardsViewRoute is found via .find(r => r.name === Routes.REWARDS_VIEW),
      // so the inner route that wraps the nested nav state must carry that name.
      const buildRewardsState = (activeRouteName: string | undefined) => ({
        routes: [
          {
            name: Routes.REWARDS_VIEW,
            state: activeRouteName
              ? {
                  routes: [
                    {
                      name: Routes.REWARDS_VIEW,
                      state: {
                        index: 0,
                        routes: [{ name: activeRouteName }],
                      },
                    },
                  ],
                }
              : undefined,
          },
        ],
        index: 0,
      });

      it('hides tab bar when navigated to a rewards sub-page', () => {
        // Given HomeTabs is rendered and the active route is a rewards sub-page
        const HomeTabs = getHomeTabsComponent();
        const renderTabBar = getTabBarFn(HomeTabs);

        // When renderTabBar is called for a rewards sub-page
        const result = renderTabBar({
          state: buildRewardsState('OndoCampaignDetails'),
          descriptors: {},
          navigation: {},
        });

        // Then the tab bar should be hidden
        expect(result).toBeNull();
      });

      it('shows tab bar when on the rewards dashboard', () => {
        // Given HomeTabs is rendered and the active route is the rewards dashboard
        const HomeTabs = getHomeTabsComponent();
        const renderTabBar = getTabBarFn(HomeTabs);

        // When renderTabBar is called for the rewards dashboard
        const result = renderTabBar({
          state: buildRewardsState(Routes.REWARDS_DASHBOARD),
          descriptors: {},
          navigation: {},
        });

        // Then the tab bar should be visible
        expect(result).not.toBeNull();
      });

      it('shows tab bar when on the rewards onboarding flow', () => {
        // Given HomeTabs is rendered and the active route is the onboarding flow
        const HomeTabs = getHomeTabsComponent();
        const renderTabBar = getTabBarFn(HomeTabs);

        // When renderTabBar is called for the onboarding flow
        const result = renderTabBar({
          state: buildRewardsState(Routes.REWARDS_ONBOARDING_FLOW),
          descriptors: {},
          navigation: {},
        });

        // Then the tab bar should be visible
        expect(result).not.toBeNull();
      });

      it('shows tab bar when rewards route has no nested navigation state yet', () => {
        // Given HomeTabs is rendered and the rewards route has no nested state
        const HomeTabs = getHomeTabsComponent();
        const renderTabBar = getTabBarFn(HomeTabs);

        // When renderTabBar is called with no nested rewards state (activeRouteName undefined)
        const result = renderTabBar({
          state: buildRewardsState(undefined),
          descriptors: {},
          navigation: {},
        });

        // Then the tab bar should be visible (default to home page)
        expect(result).not.toBeNull();
      });
    });
  });

  it('includes SampleFeature screen in the navigation stack', () => {
    // Given the initial app state
    // When rendering the MainNavigator
    const container = renderWithProvider(<MainNavigator />, {
      state: initialRootState,
    });

    // Then it should contain the SampleFeature screen with correct configuration
    interface ScreenChild {
      name: string;
      component: { name: string };
    }
    const screenProps: ScreenChild[] = container.root.children
      .filter(
        (child): child is ReactTestInstance =>
          typeof child === 'object' &&
          'type' in child &&
          'props' in child &&
          child.type?.toString() === 'Screen',
      )
      .map((child) => ({
        name: child.props.name,
        component: child.props.component,
      }));

    const sampleFeatureScreen = screenProps?.find(
      (screen) => screen?.name === Routes.SAMPLE_FEATURE,
    );

    expect(sampleFeatureScreen).toBeDefined();
    expect(sampleFeatureScreen?.component.name).toBe('SampleFeatureFlow');
  });

  it('includes FeatureFlagOverride screen when METAMASK_ENVIRONMENT is not production', () => {
    // Given a non-production environment
    process.env.METAMASK_ENVIRONMENT = 'dev';

    // When rendering the MainNavigator
    const container = renderWithProvider(<MainNavigator />, {
      state: initialRootState,
    });

    // Then it should contain the FeatureFlagOverride screen
    interface ScreenChild {
      name: string;
      component: { name: string };
    }
    const screenProps: ScreenChild[] = container.root.children
      .filter(
        (child): child is ReactTestInstance =>
          typeof child === 'object' &&
          'type' in child &&
          'props' in child &&
          child.type?.toString() === 'Screen',
      )
      .map((child) => ({
        name: child.props.name,
        component: child.props.component,
      }));

    const featureFlagOverrideScreen = screenProps?.find(
      (screen) => screen?.name === Routes.FEATURE_FLAG_OVERRIDE,
    );

    expect(featureFlagOverrideScreen).toBeDefined();
    expect(featureFlagOverrideScreen?.component.name).toBe(
      'FeatureFlagOverride',
    );
  });

  describe('Screen Registration', () => {
    const getScreenProps = (
      container: ReturnType<typeof renderWithProvider>,
    ) => {
      interface ScreenChild {
        name: string;
        component: { name: string };
        options?: {
          headerShown?: boolean;
          animation?: string;
          contentStyle?: unknown;
        };
      }
      return container.root.children
        .filter(
          (child): child is ReactTestInstance =>
            typeof child === 'object' &&
            'type' in child &&
            'props' in child &&
            child.type?.toString() === 'Screen',
        )
        .map((child) => ({
          name: child.props.name,
          component: child.props.component,
          options: child.props.options,
        })) as ScreenChild[];
    };

    it('includes Home screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const homeScreen = screenProps?.find((screen) => screen?.name === 'Home');

      expect(homeScreen).toBeDefined();
    });

    it('includes TokensFullView screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const tokensScreen = screenProps?.find(
        (screen) => screen?.name === Routes.WALLET.TOKENS_FULL_VIEW,
      );

      expect(tokensScreen).toBeDefined();
    });

    it('includes DeFiFullView screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const defiScreen = screenProps?.find(
        (screen) => screen?.name === Routes.WALLET.DEFI_FULL_VIEW,
      );

      expect(defiScreen).toBeDefined();
    });

    it('includes CashTokensFullView screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const cashTokensScreen = screenProps?.find(
        (screen) => screen?.name === Routes.WALLET.CASH_TOKENS_FULL_VIEW,
      );

      expect(cashTokensScreen).toBeDefined();
    });

    it('includes Bridge routes', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const bridgeScreen = screenProps?.find(
        (screen) => screen?.name === Routes.BRIDGE.ROOT,
      );

      expect(bridgeScreen).toBeDefined();
    });

    it('includes Earn routes', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const earnScreen = screenProps?.find(
        (screen) => screen?.name === Routes.EARN.ROOT,
      );

      expect(earnScreen).toBeDefined();
    });

    it('includes Card routes', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const cardScreen = screenProps?.find(
        (screen) => screen?.name === Routes.CARD.ROOT,
      );

      expect(cardScreen).toBeDefined();
    });

    it('includes Ramp BUY route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const rampBuyScreen = screenProps?.find(
        (screen) => screen?.name === Routes.RAMP.BUY,
      );

      expect(rampBuyScreen).toBeDefined();
    });

    it('includes Ramp SELL route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const rampSellScreen = screenProps?.find(
        (screen) => screen?.name === Routes.RAMP.SELL,
      );

      expect(rampSellScreen).toBeDefined();
    });

    it('includes Settings view route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const settingsScreen = screenProps?.find(
        (screen) => screen?.name === Routes.SETTINGS_VIEW,
      );

      expect(settingsScreen).toBeDefined();
    });

    it('includes QRTabSwitcher route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const qrScreen = screenProps?.find(
        (screen) => screen?.name === Routes.QR_TAB_SWITCHER,
      );

      expect(qrScreen).toBeDefined();
    });

    it('includes Notifications view route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const notificationsScreen = screenProps?.find(
        (screen) => screen?.name === Routes.NOTIFICATIONS.VIEW,
      );

      expect(notificationsScreen).toBeDefined();
    });

    it('includes Explore Search route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const exploreScreen = screenProps?.find(
        (screen) => screen?.name === Routes.EXPLORE_SEARCH,
      );

      expect(exploreScreen).toBeDefined();
    });
  });

  describe('Conditional Screen Rendering', () => {
    const getScreenProps = (
      container: ReturnType<typeof renderWithProvider>,
    ) => {
      interface ScreenChild {
        name: string;
        component: { name: string };
      }
      return container.root.children
        .filter(
          (child): child is ReactTestInstance =>
            typeof child === 'object' &&
            'type' in child &&
            'props' in child &&
            child.type?.toString() === 'Screen',
        )
        .map((child) => ({
          name: child.props.name,
          component: child.props.component,
        })) as ScreenChild[];
    };

    beforeEach(() => {
      mockSelectPerpsEnabledFlag.mockReturnValue(false);
      mockSelectPredictEnabledFlag.mockReturnValue(false);
      mockSelectMarketInsightsEnabled.mockReturnValue(false);
    });

    it('includes Perps routes when perps feature flag is enabled', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(true);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const perpsRootScreen = screenProps?.find(
        (screen) => screen?.name === Routes.PERPS.ROOT,
      );

      expect(perpsRootScreen).toBeDefined();
    });

    it('excludes Perps routes when perps feature flag is disabled', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(false);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const perpsRootScreen = screenProps?.find(
        (screen) => screen?.name === Routes.PERPS.ROOT,
      );

      expect(perpsRootScreen).toBeUndefined();
    });

    it('includes Perps tutorial route when perps is enabled', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(true);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const perpsTutorialScreen = screenProps?.find(
        (screen) => screen?.name === Routes.PERPS.TUTORIAL,
      );

      expect(perpsTutorialScreen).toBeDefined();
    });

    it('includes Perps transaction routes when perps is enabled', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(true);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const positionScreen = screenProps?.find(
        (screen) => screen?.name === Routes.PERPS.POSITION_TRANSACTION,
      );
      const orderScreen = screenProps?.find(
        (screen) => screen?.name === Routes.PERPS.ORDER_TRANSACTION,
      );
      const fundingScreen = screenProps?.find(
        (screen) => screen?.name === Routes.PERPS.FUNDING_TRANSACTION,
      );

      expect(positionScreen).toBeDefined();
      expect(orderScreen).toBeDefined();
      expect(fundingScreen).toBeDefined();
    });

    it('includes Predict routes when predict feature flag is enabled', () => {
      mockSelectPredictEnabledFlag.mockReturnValue(true);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const predictRootScreen = screenProps?.find(
        (screen) => screen?.name === Routes.PREDICT.ROOT,
      );

      expect(predictRootScreen).toBeDefined();
    });

    it('excludes Predict routes when predict feature flag is disabled', () => {
      mockSelectPredictEnabledFlag.mockReturnValue(false);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const predictRootScreen = screenProps?.find(
        (screen) => screen?.name === Routes.PREDICT.ROOT,
      );

      expect(predictRootScreen).toBeUndefined();
    });

    it('includes Market Insights view when feature flag is enabled', () => {
      mockSelectMarketInsightsEnabled.mockReturnValue(true);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const marketInsightsScreen = screenProps?.find(
        (screen) => screen?.name === Routes.MARKET_INSIGHTS.VIEW,
      );

      expect(marketInsightsScreen).toBeDefined();
    });

    it('excludes Market Insights view when feature flag is disabled', () => {
      mockSelectMarketInsightsEnabled.mockReturnValue(false);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const marketInsightsScreen = screenProps?.find(
        (screen) => screen?.name === Routes.MARKET_INSIGHTS.VIEW,
      );

      expect(marketInsightsScreen).toBeUndefined();
    });

    it('includes multiple conditional routes when all flags are enabled', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(true);
      mockSelectPredictEnabledFlag.mockReturnValue(true);
      mockSelectMarketInsightsEnabled.mockReturnValue(true);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);

      expect(
        screenProps?.find((screen) => screen?.name === Routes.PERPS.ROOT),
      ).toBeDefined();
      expect(
        screenProps?.find((screen) => screen?.name === Routes.PREDICT.ROOT),
      ).toBeDefined();
      expect(
        screenProps?.find(
          (screen) => screen?.name === Routes.MARKET_INSIGHTS.VIEW,
        ),
      ).toBeDefined();
    });

    it('includes Market Insights when perps insights flag is enabled', () => {
      mockSelectMarketInsightsEnabled.mockReturnValue(false);
      mockSelectMarketInsightsPerpsEnabled.mockReturnValue(true);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const marketInsightsScreen = screenProps?.find(
        (screen) => screen?.name === Routes.MARKET_INSIGHTS.VIEW,
      );

      expect(marketInsightsScreen).toBeDefined();
    });

    it('excludes Market Insights when both insights flags are disabled', () => {
      mockSelectMarketInsightsEnabled.mockReturnValue(false);
      mockSelectMarketInsightsPerpsEnabled.mockReturnValue(false);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const marketInsightsScreen = screenProps?.find(
        (screen) => screen?.name === Routes.MARKET_INSIGHTS.VIEW,
      );

      expect(marketInsightsScreen).toBeUndefined();
    });

    it('includes Perps modal routes when perps is enabled', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(true);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const perpsModalScreen = screenProps?.find(
        (screen) => screen?.name === Routes.PERPS.MODALS.ROOT,
      );

      expect(perpsModalScreen).toBeDefined();
    });

    it('includes Predict modal routes when predict is enabled', () => {
      mockSelectPredictEnabledFlag.mockReturnValue(true);

      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const predictModalScreen = screenProps?.find(
        (screen) => screen?.name === Routes.PREDICT.MODALS.ROOT,
      );

      expect(predictModalScreen).toBeDefined();
    });
  });

  describe('Additional Screen Routes', () => {
    const getScreenProps = (
      container: ReturnType<typeof renderWithProvider>,
    ) => {
      interface ScreenChild {
        name: string;
        component: { name: string };
        options?: {
          headerShown?: boolean;
          animation?: string;
          contentStyle?: unknown;
        };
      }
      return container.root.children
        .filter(
          (child): child is ReactTestInstance =>
            typeof child === 'object' &&
            'type' in child &&
            'props' in child &&
            child.type?.toString() === 'Screen',
        )
        .map((child) => ({
          name: child.props.name,
          component: child.props.component,
          options: child.props.options,
        })) as ScreenChild[];
    };

    it('includes DeprecatedNetworkDetails screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.DEPRECATED_NETWORK_DETAILS,
      );

      expect(screen).toBeDefined();
    });

    it('includes TrendingTokensFullView screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === 'TrendingTokensFullView',
      );

      expect(screen).toBeDefined();
    });

    it('includes RWATokensFullView screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'RWATokensFullView');

      expect(screen).toBeDefined();
    });

    it('includes Webview screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'Webview');

      expect(screen).toBeDefined();
    });

    it('includes Send screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'Send');

      expect(screen).toBeDefined();
    });

    it('includes AddBookmarkView screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'AddBookmarkView');

      expect(screen).toBeDefined();
    });

    it('includes OfflineModeView screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'OfflineModeView');

      expect(screen).toBeDefined();
    });

    it('includes NftDetails screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'NftDetails');

      expect(screen).toBeDefined();
    });

    it('includes NftDetailsFullImage screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === 'NftDetailsFullImage',
      );

      expect(screen).toBeDefined();
    });

    it('includes AddAsset screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'AddAsset');

      expect(screen).toBeDefined();
    });

    it('includes ConfirmAddAsset screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'ConfirmAddAsset');

      expect(screen).toBeDefined();
      expect(screen?.options?.headerShown).toBe(false);
      expect(screen?.options?.animation).toBe('slide_from_right');
    });

    it('includes StakeScreens route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'StakeScreens');

      expect(screen).toBeDefined();
    });

    it('includes StakeModals route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'StakeModals');

      expect(screen).toBeDefined();
    });

    it('includes Bridge modal routes', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.BRIDGE.MODALS.ROOT,
      );

      expect(screen).toBeDefined();
    });

    it('includes Earn modal routes', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.EARN.MODALS.ROOT,
      );

      expect(screen).toBeDefined();
    });

    it('includes SetPasswordFlow screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'SetPasswordFlow');

      expect(screen).toBeDefined();
    });

    it('includes GeneralSettings screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'GeneralSettings');

      expect(screen).toBeDefined();
    });

    it('includes DeFiProtocolPositionDetails screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === 'DeFiProtocolPositionDetails',
      );

      expect(screen).toBeDefined();
      expect(screen?.options?.headerShown).toBe(false);
      expect(screen?.options?.animation).toBe('slide_from_right');
    });

    it('includes Asset screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === 'Asset');

      expect(screen).toBeDefined();
    });

    it('includes SitesFullView screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.SITES_FULL_VIEW,
      );

      expect(screen).toBeDefined();
    });

    it('includes WhatsHappeningDetailView screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.WHATS_HAPPENING_DETAIL,
      );

      expect(screen).toBeDefined();
    });

    it('includes Browser home screen in main navigator', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === Routes.BROWSER.HOME);

      expect(screen).toBeDefined();
    });

    it('includes Ramp processing info modal route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.RAMP.MODALS.PROCESSING_INFO,
      );

      expect(screen).toBeDefined();
    });

    it('includes Card routes', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find((s) => s?.name === Routes.CARD.ROOT);

      expect(screen).toBeDefined();
    });

    it('includes NFTs full view route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.WALLET.NFTS_FULL_VIEW,
      );

      expect(screen).toBeDefined();
    });

    it('includes Token Selection route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.RAMP.TOKEN_SELECTION,
      );

      expect(screen).toBeDefined();
    });

    it('includes Benefits full view route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.REWARD_BENEFITS_FULL_VIEW,
      );

      expect(screen).toBeDefined();
      expect(screen?.options?.headerShown).toBe(false);
      expect(screen?.options?.animation).toBe('slide_from_right');
    });

    it('includes Benefit detail full view route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.REWARD_BENEFIT_FULL_VIEW,
      );

      expect(screen).toBeDefined();
      expect(screen?.options?.headerShown).toBe(false);
      expect(screen?.options?.animation).toBe('slide_from_right');
    });
  });

  it('includes SocialTradersView screen when Social Leaderboard remote flag is enabled', () => {
    const stateWithSocialLeaderboard = {
      ...initialRootState,
      engine: {
        ...initialRootState.engine,
        backgroundState: {
          ...initialRootState.engine.backgroundState,
          RemoteFeatureFlagController: {
            ...initialRootState.engine.backgroundState
              .RemoteFeatureFlagController,
            remoteFeatureFlags: {
              ...initialRootState.engine.backgroundState
                .RemoteFeatureFlagController.remoteFeatureFlags,
              aiSocialLeaderboardEnabled: {
                enabled: true,
                minimumVersion: '0.0.1',
              },
            },
          },
        },
      },
    };

    const container = renderWithProvider(<MainNavigator />, {
      state: stateWithSocialLeaderboard,
    });

    interface ScreenChild {
      name: string;
      component: { name: string };
    }
    const screenProps: ScreenChild[] = container.root.children
      .filter(
        (child): child is ReactTestInstance =>
          typeof child === 'object' &&
          'type' in child &&
          'props' in child &&
          child.type?.toString() === 'Screen',
      )
      .map((child) => ({
        name: child.props.name,
        component: child.props.component,
      }));

    const topTradersScreen = screenProps?.find(
      (screen) => screen?.name === Routes.SOCIAL_LEADERBOARD.VIEW,
    );

    expect(topTradersScreen).toBeDefined();
    expect(topTradersScreen?.component.name).toBe('SocialTradersView');
  });

  describe('Inner navigator component rendering', () => {
    const getScreenComponent = (
      root: ReactTestInstance,
      screenName: string,
      screenType = 'Screen',
    ): React.ComponentType<Record<string, unknown>> => {
      const nodes = root.findAll(
        (node: ReactTestInstance) =>
          node.type?.toString?.() === screenType &&
          node.props?.name === screenName,
      );
      const component = nodes[0]?.props?.component;
      if (!component) {
        throw new Error(
          `Screen "${screenName}" (type: ${screenType}) not found`,
        );
      }
      return component;
    };

    const renderInner = (
      Component: React.ComponentType<Record<string, unknown>>,
      props: Record<string, unknown> = {},
    ) =>
      renderWithProvider(<Component route={{ params: {} }} {...props} />, {
        state: initialRootState,
      });

    describe('MainNavigator top-level screens', () => {
      it('renders HomeTabs with tab navigation structure', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const HomeTabs = getScreenComponent(root, 'Home');
        const result = renderInner(HomeTabs);
        expect(result.toJSON()).toBeTruthy();
      });

      it('renders SettingsFlow navigator', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const Component = getScreenComponent(root, Routes.SETTINGS_VIEW);
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders Webview navigator', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const Component = getScreenComponent(root, 'Webview');
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders AddBookmarkView navigator', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const Component = getScreenComponent(root, 'AddBookmarkView');
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders OfflineModeView navigator', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const Component = getScreenComponent(root, 'OfflineModeView');
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders NotificationsModeView navigator', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const Component = getScreenComponent(root, Routes.NOTIFICATIONS.VIEW);
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders NftDetailsModeView navigator', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const Component = getScreenComponent(root, 'NftDetails');
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders NftDetailsFullImageModeView navigator', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const Component = getScreenComponent(root, 'NftDetailsFullImage');
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders SetPasswordFlow navigator', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const Component = getScreenComponent(root, 'SetPasswordFlow');
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders AssetNavigator', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const Component = getScreenComponent(root, 'Asset');
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('registers the RewardsNavigator under the root REWARDS_FLOW route', () => {
        // REWARDS_FLOW is a root-level stack screen distinct from the Rewards
        // tab (REWARDS_VIEW). RewardsNavigator is pushed onto the JS root stack
        // so its native-stack sub-pages animate independently of the tabs.
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });

        const rewardsFlowScreen = root.findAll(
          (node: ReactTestInstance) =>
            node.type?.toString?.() === 'Screen' &&
            node.props?.name === Routes.REWARDS_FLOW,
        )[0];

        expect(rewardsFlowScreen).toBeTruthy();
        expect(rewardsFlowScreen?.props?.component?.name).toBe(
          'RewardsNavigator',
        );
      });

      it('hides the header for the root REWARDS_FLOW route', () => {
        // The flow renders its own headers, so the outer root-stack screen must
        // not draw one on top.
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });

        const rewardsFlowScreen = root.findAll(
          (node: ReactTestInstance) =>
            node.type?.toString?.() === 'Screen' &&
            node.props?.name === Routes.REWARDS_FLOW,
        )[0];

        expect(rewardsFlowScreen?.props?.options).toEqual(
          expect.objectContaining({ headerShown: false }),
        );
      });
    });

    describe('HomeTabs child tab screens', () => {
      let homeTabsRoot: ReactTestInstance;

      beforeEach(() => {
        const { root: mainRoot } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const HomeTabs = getScreenComponent(mainRoot, 'Home');
        const { root } = renderInner(HomeTabs);
        homeTabsRoot = root;
      });

      it('renders WalletTabModalFlow', () => {
        const Component = getScreenComponent(
          homeTabsRoot,
          Routes.WALLET.HOME,
          'TabScreen',
        );
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders ExploreHome', () => {
        const Component = getScreenComponent(
          homeTabsRoot,
          Routes.TRENDING_VIEW,
          'TabScreen',
        );
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders BrowserFlow', () => {
        const Component = getScreenComponent(
          homeTabsRoot,
          Routes.BROWSER.HOME,
          'TabScreen',
        );
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders TransactionsHome', () => {
        const Component = getScreenComponent(
          homeTabsRoot,
          Routes.TRANSACTIONS_VIEW,
          'TabScreen',
        );
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('renders RewardsHome', () => {
        const Component = getScreenComponent(
          homeTabsRoot,
          Routes.REWARDS_VIEW,
          'TabScreen',
        );
        expect(renderInner(Component).toJSON()).toBeTruthy();
      });

      it('gates the Rewards tab behind RewardsUpdateRequired when the client version is blocked', () => {
        // The version guard now lives in RewardsHome (above the
        // onboarding/dashboard branch), so version-blocked clients see the
        // update-required screen regardless of subscription status.
        const RewardsHome = getScreenComponent(
          homeTabsRoot,
          Routes.REWARDS_VIEW,
          'TabScreen',
        );
        const { getByTestId } = renderWithProvider(
          <RewardsHome route={{ params: {} }} />,
          {
            state: {
              ...initialRootState,
              rewards: {
                ...initialRootState.rewards,
                // Higher than the mocked device version (7.72.0) → blocked.
                versionGuardMinimumMobileVersion: '999.0.0',
              },
            },
          },
        );

        expect(getByTestId('rewards-update-required-container')).toBeTruthy();
      });

      it('fetches the candidate subscription id at the Rewards tab entry point', () => {
        // Regression: non-opted-in users only ever mount RewardsHome ->
        // RewardsOnboardingNavigator (never RewardsDashboard / RewardsNavigator),
        // so the candidate-subscription fetch must run here. Otherwise
        // candidateSubscriptionId stays 'pending' and OnboardingMainStep shows a
        // full-screen skeleton indefinitely.
        mockUseCandidateSubscriptionId.mockClear();
        const RewardsHome = getScreenComponent(
          homeTabsRoot,
          Routes.REWARDS_VIEW,
          'TabScreen',
        );
        renderWithProvider(<RewardsHome route={{ params: {} }} />, {
          state: initialRootState,
        });

        expect(mockUseCandidateSubscriptionId).toHaveBeenCalled();
      });

      const findRewardsHomeScreenNames = (
        subscriptionId: string | null,
      ): string[] => {
        const RewardsHome = getScreenComponent(
          homeTabsRoot,
          Routes.REWARDS_VIEW,
          'TabScreen',
        );
        const { root } = renderWithProvider(
          <RewardsHome route={{ params: {} }} />,
          {
            state: {
              ...initialRootState,
              rewards: {
                ...initialRootState.rewards,
                // A concrete (non-pending/error/retry) candidate id makes
                // selectRewardsSubscriptionId resolve to a subscription.
                candidateSubscriptionId: subscriptionId,
              },
            },
          },
        );

        return root
          .findAll(
            (node: ReactTestInstance) =>
              node.type?.toString?.() === 'Screen' &&
              typeof node.props?.name === 'string',
          )
          .map((node) => node.props.name as string);
      };

      it('registers onboarding and dashboard in the Rewards tab stack', () => {
        // Both routes stay registered so opt-in can push the dashboard with a
        // native slide transition; initialRouteName picks the entry screen.
        const screenNames = findRewardsHomeScreenNames('test-subscription-id');

        expect(screenNames).toContain(Routes.REWARDS_DASHBOARD);
        expect(screenNames).toContain(Routes.REWARDS_ONBOARDING_FLOW);
      });

      it('registers onboarding and dashboard when the user has no subscription', () => {
        const screenNames = findRewardsHomeScreenNames(null);

        expect(screenNames).toContain(Routes.REWARDS_ONBOARDING_FLOW);
        expect(screenNames).toContain(Routes.REWARDS_DASHBOARD);
      });

      it('does not register rewards modal screens in the Rewards tab stack', () => {
        // Modal sheets live on the root MainNavigator so they are reachable from
        // both the Rewards tab and REWARDS_FLOW without switching tabs.
        const screenNames = findRewardsHomeScreenNames('test-subscription-id');

        expect(screenNames).not.toContain(
          Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
        );
        expect(screenNames).not.toContain(
          Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL,
        );
        expect(screenNames).not.toContain(
          Routes.MODAL.REWARDS_OPTIN_ACCOUNT_GROUP_MODAL,
        );
        expect(screenNames).not.toContain(
          Routes.MODAL.REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET,
        );
        expect(screenNames).not.toContain(Routes.MODAL.REWARDS_SELECT_SHEET);
      });
    });

    describe('Root rewards modal screens', () => {
      const findRootScreenNames = (): string[] => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });

        return root
          .findAll(
            (node: ReactTestInstance) =>
              node.type?.toString?.() === 'Screen' &&
              typeof node.props?.name === 'string',
          )
          .map((node) => node.props.name as string);
      };

      it('registers rewards modal screens on the root navigator', () => {
        const screenNames = findRootScreenNames();

        expect(screenNames).toEqual(
          expect.arrayContaining([
            Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
            Routes.MODAL.REWARDS_CLAIM_BOTTOM_SHEET_MODAL,
            Routes.MODAL.REWARDS_OPTIN_ACCOUNT_GROUP_MODAL,
            Routes.MODAL.REWARDS_END_OF_SEASON_CLAIM_BOTTOM_SHEET,
            Routes.MODAL.REWARDS_SELECT_SHEET,
          ]),
        );
      });
    });

    describe('Nested navigator components', () => {
      it('renders WalletView inside WalletTabStackFlow', () => {
        const { root: mainRoot } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const HomeTabs = getScreenComponent(mainRoot, 'Home');
        const { root: homeRoot } = renderInner(HomeTabs);
        const WalletTabStackFlow = getScreenComponent(
          homeRoot,
          Routes.WALLET.HOME,
          'TabScreen',
        );
        const { root: walletStackRoot } = renderInner(WalletTabStackFlow);

        // WalletTabStackFlow now directly contains WalletView (Wallet component)
        // instead of a nested modal navigator. Verify the screen exists without
        // rendering Wallet itself (which has many unmocked dependencies).
        const WalletView = getScreenComponent(walletStackRoot, 'WalletView');
        expect(WalletView).toBeTruthy();
      });

      it('renders RevealPrivateCredential inside WalletTabStackFlow', () => {
        const { root: mainRoot } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const HomeTabs = getScreenComponent(mainRoot, 'Home');
        const { root: homeRoot } = renderInner(HomeTabs);
        const WalletTabStackFlow = getScreenComponent(
          homeRoot,
          Routes.WALLET.HOME,
          'TabScreen',
        );
        const { root: walletStackRoot } = renderInner(WalletTabStackFlow);

        // RevealPrivateCredential is now a sibling screen inside WalletTabStackFlow
        // (previously it was nested inside WalletModalFlow).
        const RevealPrivateCredential = getScreenComponent(
          walletStackRoot,
          Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
        );
        expect(RevealPrivateCredential).toBeTruthy();
      });

      it('renders AssetStackFlow inside AssetNavigator', () => {
        const { root: mainRoot } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const AssetNavigator = getScreenComponent(mainRoot, 'Asset');
        const { root: assetNavRoot } = renderInner(AssetNavigator);

        const AssetStackFlow = getScreenComponent(
          assetNavRoot,
          'AssetStackFlow',
        );
        expect(renderInner(AssetStackFlow).toJSON()).toBeTruthy();
      });

      it('renders SnapsSettingsStack inside SettingsFlow', () => {
        const { root: mainRoot } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const SettingsFlow = getScreenComponent(mainRoot, Routes.SETTINGS_VIEW);
        const { root: settingsRoot } = renderInner(SettingsFlow);

        const SnapsSettingsStack = getScreenComponent(
          settingsRoot,
          Routes.SNAPS.SNAPS_SETTINGS_LIST,
        );
        expect(renderInner(SnapsSettingsStack).toJSON()).toBeTruthy();
      });
    });

    describe('Money account conditional rendering', () => {
      const getHomeTabsScreenNames = (): string[] => {
        const { root: mainRoot } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const homeScreen = mainRoot.findAll(
          (node: ReactTestInstance) =>
            node.type?.toString?.() === 'Screen' && node.props?.name === 'Home',
        )[0];
        const HomeTabs = homeScreen?.props?.component as React.ComponentType<
          Record<string, unknown>
        >;
        const { root: homeRoot } = renderWithProvider(
          <HomeTabs route={{ params: {} }} />,
          { state: initialRootState },
        );
        const tabNavigatorNode = homeRoot.findAll(
          (node: ReactTestInstance) =>
            node.type?.toString?.() === 'TabNavigator',
        )[0];
        return (tabNavigatorNode?.children ?? [])
          .filter(
            (child): child is ReactTestInstance =>
              typeof child === 'object' &&
              'props' in child &&
              typeof child.props?.name === 'string',
          )
          .map((child) => child.props.name as string);
      };

      it('includes Money route when feature flag is enabled', () => {
        mockSelectMoneyEnableMoneyAccountFlag.mockReturnValue(true);

        const tabScreenNames = getHomeTabsScreenNames();

        expect(tabScreenNames).toContain(Routes.MONEY.ROOT);
        mockSelectMoneyEnableMoneyAccountFlag.mockReturnValue(false);
      });

      it('excludes Money route when feature flag is disabled', () => {
        mockSelectMoneyEnableMoneyAccountFlag.mockReturnValue(false);

        const tabScreenNames = getHomeTabsScreenNames();

        expect(tabScreenNames).not.toContain(Routes.MONEY.ROOT);
      });
    });
  });
});
