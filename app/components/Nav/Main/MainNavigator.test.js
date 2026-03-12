/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MainNavigator from './MainNavigator';

jest.mock('@react-navigation/stack', () => {
  const { View, Text } = require('react-native');
  return {
    createStackNavigator: () => ({
      Navigator: ({ children, screenOptions, initialRouteName }) => (
        <View testID="stack-navigator">
          {screenOptions?.headerShown === false && (
            <Text>headerShown: false</Text>
          )}
          {initialRouteName && (
            <Text testID="initial-route">{initialRouteName}</Text>
          )}
          {children}
        </View>
      ),
      Screen: ({ name, options }) => (
        <View testID={`screen-${name}`}>
          <Text>{name}</Text>
          {options?.headerShown === false && <Text>no-header</Text>}
        </View>
      ),
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const { View, Text } = require('react-native');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children, screenOptions, initialRouteName, tabBar }) => (
        <View testID="tab-navigator">
          {initialRouteName && (
            <Text testID="tab-initial-route">{initialRouteName}</Text>
          )}
          {children}
        </View>
      ),
      Screen: ({ name, options }) => (
        <View testID={`tab-screen-${name}`}>
          <Text>{name}</Text>
        </View>
      ),
    }),
  };
});

jest.mock('../../Views/Browser', () => {
  const { View } = require('react-native');
  return () => <View testID="browser" />;
});

jest.mock('../../Views/Wallet', () => {
  const { View } = require('react-native');
  return () => <View testID="wallet" />;
});

jest.mock('../../Views/Settings', () => {
  const { View } = require('react-native');
  return () => <View testID="settings" />;
});

jest.mock('../../Views/ActivityView', () => {
  const { View } = require('react-native');
  return () => <View testID="activity-view" />;
});

jest.mock('../../Views/QRTabSwitcher', () => {
  const { View } = require('react-native');
  return () => <View testID="qr-tab-switcher" />;
});

jest.mock('../../UI/Ramp/Aggregator/routes', () => {
  const { View } = require('react-native');
  return () => <View testID="ramp-routes" />;
});

jest.mock('../../UI/Ramp/routes', () => {
  const { View } = require('react-native');
  return () => <View testID="token-list-routes" />;
});

jest.mock('../../UI/Ramp/Deposit/routes', () => {
  const { View } = require('react-native');
  return () => <View testID="deposit-routes" />;
});

jest.mock('../../UI/Stake/routes', () => ({
  StakeModalStack: () => {
    const { View } = require('react-native');
    return <View testID="stake-modal-stack" />;
  },
  StakeScreenStack: () => {
    const { View } = require('react-native');
    return <View testID="stake-screen-stack" />;
  },
}));

jest.mock('../../UI/Earn/routes', () => ({
  EarnScreenStack: () => {
    const { View } = require('react-native');
    return <View testID="earn-screen-stack" />;
  },
  EarnModalStack: () => {
    const { View } = require('react-native');
    return <View testID="earn-modal-stack" />;
  },
}));

jest.mock('../../UI/Bridge/routes', () => ({
  BridgeModalStack: () => {
    const { View } = require('react-native');
    return <View testID="bridge-modal-stack" />;
  },
  BridgeScreenStack: () => {
    const { View } = require('react-native');
    return <View testID="bridge-screen-stack" />;
  },
}));

jest.mock('../../UI/Card/routes', () => {
  const { View } = require('react-native');
  return () => <View testID="card-routes" />;
});

jest.mock('../../UI/Rewards/RewardsNavigator', () => {
  const { View } = require('react-native');
  return () => <View testID="rewards-navigator" />;
});

jest.mock('../../UI/Perps', () => ({
  PerpsScreenStack: () => {
    const { View } = require('react-native');
    return <View testID="perps-screen-stack" />;
  },
  PerpsModalStack: () => {
    const { View } = require('react-native');
    return <View testID="perps-modal-stack" />;
  },
  PerpsTutorialCarousel: () => {
    const { View } = require('react-native');
    return <View testID="perps-tutorial" />;
  },
  selectPerpsEnabledFlag: () => false,
}));

jest.mock('../../UI/Predict', () => ({
  PredictScreenStack: () => {
    const { View } = require('react-native');
    return <View testID="predict-screen-stack" />;
  },
  PredictModalStack: () => {
    const { View } = require('react-native');
    return <View testID="predict-modal-stack" />;
  },
  selectPredictEnabledFlag: () => false,
}));

jest.mock('../../UI/MarketInsights', () => ({
  MarketInsightsView: () => {
    const { View } = require('react-native');
    return <View testID="market-insights-view" />;
  },
  selectMarketInsightsEnabled: () => false,
}));

jest.mock('../../Views/TrendingView/TrendingView', () => ({
  ExploreFeed: () => {
    const { View } = require('react-native');
    return <View testID="explore-feed" />;
  },
}));

jest.mock('../../UI/Trending/services/TrendingFeedSessionManager', () => ({
  getInstance: () => ({
    enableAppStateListener: jest.fn(),
    disableAppStateListener: jest.fn(),
    startSession: jest.fn(),
    endSession: jest.fn(),
  }),
}));

jest.mock('../../../component-library/components/Navigation/TabBar', () => {
  const { View } = require('react-native');
  return () => <View testID="tab-bar" />;
});

jest.mock(
  '../../../selectors/featureFlagController/accountMenu/useAccountMenuEnabled',
  () => ({
    useAccountMenuEnabled: () => false,
  }),
);

jest.mock('../../Views/confirmations/components/send', () => ({
  Send: () => {
    const { View } = require('react-native');
    return <View testID="send" />;
  },
}));

jest.mock(
  '../../Views/confirmations/components/activity/transaction-details/transaction-details',
  () => ({
    TransactionDetails: () => {
      const { View } = require('react-native');
      return <View testID="transaction-details" />;
    },
  }),
);

jest.mock('../../../components/hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  }),
}));

jest.mock('../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: () => null,
}));

const createMockStore = () =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          NetworkController: {
            providerConfig: {
              type: 'mainnet',
              chainId: '0x1',
            },
          },
          AccountTrackerController: {
            accounts: {
              '0x123': { balance: '0x0' },
            },
          },
          PreferencesController: {
            featureFlags: {},
          },
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {},
          },
        },
      }),
      browser: () => ({
        tabs: [],
      }),
      settings: () => ({
        searchEngine: 'DuckDuckGo',
      }),
      user: () => ({
        seedphraseBackedUp: true,
      }),
      rewards: () => ({
        subscriptionId: null,
      }),
    },
  });

describe('MainNavigator', () => {
  const renderWithProviders = (component) =>
    render(
      <Provider store={createMockStore()}>
        <NavigationContainer>{component}</NavigationContainer>
      </Provider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MainNavigator component', () => {
    it('renders successfully', () => {
      const { getByTestId } = renderWithProviders(<MainNavigator />);

      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('has Home as initial route', () => {
      const { getAllByTestId } = renderWithProviders(<MainNavigator />);

      const initialRoutes = getAllByTestId('initial-route');
      expect(initialRoutes.some((el) => el.children[0] === 'Home')).toBe(true);
    });

    it('includes Home screen', () => {
      const { getByTestId } = renderWithProviders(<MainNavigator />);

      expect(getByTestId('screen-Home')).toBeTruthy();
    });

    it('includes Send screen', () => {
      const { getByTestId } = renderWithProviders(<MainNavigator />);

      expect(getByTestId('screen-Send')).toBeTruthy();
    });

    it('includes AddAsset screen', () => {
      const { getByTestId } = renderWithProviders(<MainNavigator />);

      expect(getByTestId('screen-AddAsset')).toBeTruthy();
    });

    it('includes Asset screen', () => {
      const { getByTestId } = renderWithProviders(<MainNavigator />);

      expect(getByTestId('screen-Asset')).toBeTruthy();
    });

    it('includes Webview screen', () => {
      const { getByTestId } = renderWithProviders(<MainNavigator />);

      expect(getByTestId('screen-Webview')).toBeTruthy();
    });

    it('includes SetPasswordFlow screen', () => {
      const { getByTestId } = renderWithProviders(<MainNavigator />);

      expect(getByTestId('screen-SetPasswordFlow')).toBeTruthy();
    });

    it('includes StakeScreens', () => {
      const { getByTestId } = renderWithProviders(<MainNavigator />);

      expect(getByTestId('screen-StakeScreens')).toBeTruthy();
    });

    it('includes StakeModals', () => {
      const { getByTestId } = renderWithProviders(<MainNavigator />);

      expect(getByTestId('screen-StakeModals')).toBeTruthy();
    });
  });
});
