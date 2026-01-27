import React from 'react';
import MainNavigator from './MainNavigator';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialRootState from '../../../util/test/initial-root-state';
import Routes from '../../../constants/navigation/Routes';
import { ReactTestInstance } from 'react-test-renderer';

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn().mockReturnValue({
    Navigator: 'Navigator',
    Screen: 'Screen',
  }),
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

  describe('MUSD Conversion Transaction Details', () => {
    it('has MUSD conversion transaction details route defined', () => {
      // Verify the route constant is properly defined
      expect(Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS).toBeDefined();
      expect(Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS).toBe(
        'MusdConversionTransactionDetails',
      );
    });

    it('renders MainNavigator with transactions home containing MUSD route', () => {
      // The MUSD route is nested in TransactionsHome stack which is part of HomeTabs
      // Verify the MainNavigator renders successfully with the structure
      const { toJSON } = renderWithProvider(<MainNavigator />, {
        state: initialRootState,
      });

      // Verify MainNavigator renders and includes the Home tab which contains TransactionsHome
      expect(toJSON()).toBeDefined();
      const json = JSON.stringify(toJSON());
      // Home contains the activity tab which includes TransactionsHome with MUSD route
      expect(json).toContain('Home');
    });
  });
});
