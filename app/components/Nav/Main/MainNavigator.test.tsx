import React from 'react';
import MainNavigator from './MainNavigator';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialRootState from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';
import { ReactTestInstance } from 'react-test-renderer';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.72.0'),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn().mockReturnValue({
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

jest.mock('../../UI/Predict', () => ({
  PredictScreenStack: () => 'PredictScreenStack',
  PredictModalStack: () => 'PredictModalStack',
  selectPredictEnabledFlag: (state: unknown) =>
    mockSelectPredictEnabledFlag(state),
}));

jest.mock('../../UI/MarketInsights', () => ({
  MarketInsightsView: () => 'MarketInsightsView',
  selectMarketInsightsEnabled: (state: unknown) =>
    mockSelectMarketInsightsEnabled(state),
}));

jest.mock('../../../selectors/featureFlagController/marketInsights', () => ({
  selectMarketInsightsPerpsEnabled: (state: unknown) =>
    mockSelectMarketInsightsPerpsEnabled(state),
}));

jest.mock('../../hooks/useAnalytics/useAnalytics');

const mockSelectMoneyHomeScreenEnabledFlag = jest.fn().mockReturnValue(false);
jest.mock('../../UI/Money/selectors/featureFlags', () => ({
  selectMoneyHomeScreenEnabledFlag: (state: unknown) =>
    mockSelectMoneyHomeScreenEnabledFlag(state),
}));

describe('MainNavigator', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
  });

  it('matches rendered snapshot', () => {
    // Given the initial app state
    // When rendering the MainNavigator
    const { toJSON } = renderWithProvider(<MainNavigator />, {
      state: initialRootState,
    });

    // Then it should match the expected navigation structure
    expect(toJSON()).toMatchSnapshot();
  });

  describe('Tab Bar Visibility', () => {
    it('hides tab bar when browser is active', () => {
      // Given a state where browser is the active route
      const stateWithBrowserActive = {
        ...initialRootState,
        browser: {
          ...initialRootState.browser,
          activeTab: 0,
          tabs: [{ url: 'https://example.com', id: 0 }],
        },
      };

      // When rendering the MainNavigator
      const { toJSON } = renderWithProvider(<MainNavigator />, {
        state: stateWithBrowserActive,
      });

      // Then the tab bar should be hidden (returns null in renderTabBar)
      expect(toJSON()).toMatchSnapshot();
    });

    it('shows tab bar when not in browser', () => {
      // Given a state where wallet is the active route
      const stateWithWalletActive = {
        ...initialRootState,
        browser: {
          ...initialRootState.browser,
          activeTab: null,
          tabs: [],
        },
      };

      // When rendering the MainNavigator
      const { toJSON } = renderWithProvider(<MainNavigator />, {
        state: stateWithWalletActive,
      });

      // Then the tab bar should be visible
      expect(toJSON()).toMatchSnapshot();
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

    it('includes Deposit route', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const depositScreen = screenProps?.find(
        (screen) => screen?.name === Routes.DEPOSIT.ID,
      );

      expect(depositScreen).toBeDefined();
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

    it('includes CollectiblesDetails screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === 'CollectiblesDetails',
      );

      expect(screen).toBeDefined();
    });

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

    it('includes NotificationsOptInStack screen', () => {
      const container = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      const screenProps = getScreenProps(container);
      const screen = screenProps?.find(
        (s) => s?.name === Routes.NOTIFICATIONS.OPT_IN_STACK,
      );

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
  });

  it('includes TopTradersView screen when Social Leaderboard remote flag is enabled', () => {
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
    expect(topTradersScreen?.component.name).toBe('TopTradersView');
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

      it('renders NotificationsOptInStack navigator', () => {
        const { root } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const Component = getScreenComponent(
          root,
          Routes.NOTIFICATIONS.OPT_IN_STACK,
        );
        expect(renderInner(Component).toJSON()).toBeTruthy();
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
    });

    describe('Nested navigator components', () => {
      it('renders WalletTabStackFlow inside WalletTabModalFlow', () => {
        const { root: mainRoot } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const HomeTabs = getScreenComponent(mainRoot, 'Home');
        const { root: homeRoot } = renderInner(HomeTabs);
        const WalletTabModalFlow = getScreenComponent(
          homeRoot,
          Routes.WALLET.HOME,
          'TabScreen',
        );
        const { root: walletModalRoot } = renderInner(WalletTabModalFlow);

        const WalletTabStackFlow = getScreenComponent(
          walletModalRoot,
          Routes.WALLET.TAB_STACK_FLOW,
        );
        expect(renderInner(WalletTabStackFlow).toJSON()).toBeTruthy();
      });

      it('renders WalletModalFlow inside WalletTabStackFlow', () => {
        const { root: mainRoot } = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });
        const HomeTabs = getScreenComponent(mainRoot, 'Home');
        const { root: homeRoot } = renderInner(HomeTabs);
        const WalletTabModalFlow = getScreenComponent(
          homeRoot,
          Routes.WALLET.HOME,
          'TabScreen',
        );
        const { root: walletModalRoot } = renderInner(WalletTabModalFlow);
        const WalletTabStackFlow = getScreenComponent(
          walletModalRoot,
          Routes.WALLET.TAB_STACK_FLOW,
        );
        const { root: walletStackRoot } = renderInner(WalletTabStackFlow);

        const WalletModalFlow = getScreenComponent(
          walletStackRoot,
          'WalletView',
        );
        expect(renderInner(WalletModalFlow).toJSON()).toBeTruthy();
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
    });

    describe('Money home screen conditional rendering', () => {
      it('includes Money route when feature flag is enabled', () => {
        mockSelectMoneyHomeScreenEnabledFlag.mockReturnValue(true);

        const container = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });

        const screenProps = container.root.children
          .filter(
            (child): child is ReactTestInstance =>
              typeof child === 'object' &&
              'type' in child &&
              'props' in child &&
              child.type?.toString() === 'Screen',
          )
          .map((child) => child.props.name);

        expect(screenProps).toContain(Routes.MONEY.ROOT);
        mockSelectMoneyHomeScreenEnabledFlag.mockReturnValue(false);
      });

      it('excludes Money route when feature flag is disabled', () => {
        mockSelectMoneyHomeScreenEnabledFlag.mockReturnValue(false);

        const container = renderWithProvider(<MainNavigator />, {
          state: initialRootState,
        });

        const screenProps = container.root.children
          .filter(
            (child): child is ReactTestInstance =>
              typeof child === 'object' &&
              'type' in child &&
              'props' in child &&
              child.type?.toString() === 'Screen',
          )
          .map((child) => child.props.name);

        expect(screenProps).not.toContain(Routes.MONEY.ROOT);
      });
    });
  });
});
