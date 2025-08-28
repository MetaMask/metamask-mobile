// Mock react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Mock localization strings
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: { [key: string]: string } = {
      'bottom_nav.home': 'Home',
      'bottom_nav.browser': 'Browser',
      'bottom_nav.activity': 'Activity',
      'bottom_nav.settings': 'Settings',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

// Mock the metrics hook
jest.mock('../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({ build: jest.fn() })),
      build: jest.fn(),
    })),
  }),
}));

// Mock the tailwind hook and Theme
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const mockTw = jest.fn(() => ({}));
    return Object.assign(mockTw, {
      style: jest.fn(() => ({})),
      color: jest.fn(() => '#000000'),
    });
  },
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  Theme: {
    Light: {
      colors: {
        primary: { default: '#000' },
        background: { default: '#fff' },
      },
    },
  },
}));

// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { useSelector } from 'react-redux';

// External dependencies
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';

// Internal dependencies
import TabBar from './TabBar';
import { TabBarIconKey } from './TabBar.types';
import Routes from '../../../../constants/navigation/Routes';

// Mock the navigation object.
const navigation = {
  navigate: jest.fn(),
};

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Define the test cases.
describe('TabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock implementation
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectRewardsEnabledFlag')) {
        return false; // Default to rewards disabled
      }
      if (selector.toString().includes('selectChainId')) {
        return '0x1'; // Default chain ID
      }
      return selector(mockInitialState);
    });
  });
  const state = {
    index: 0,
    routes: [
      { key: '1', name: 'Tab 1' },
      { key: '2', name: 'Tab 2' },
      { key: '3', name: 'Tab 3' },
      { key: '4', name: 'Tab 4' },
      { key: '5', name: 'Tab 5' },
    ],
  };
  const descriptors = {
    '1': {
      options: {
        tabBarIconKey: TabBarIconKey.Wallet,
        rootScreenName: Routes.WALLET_VIEW,
      },
    },
    '2': {
      options: {
        tabBarIconKey: TabBarIconKey.Browser,
        rootScreenName: Routes.BROWSER.VIEW,
      },
    },
    '3': {
      options: {
        tabBarIconKey: TabBarIconKey.Actions,
        rootScreenName: Routes.MODAL.WALLET_ACTIONS,
      },
    },
    '4': {
      options: {
        tabBarIconKey: TabBarIconKey.Activity,
        rootScreenName: Routes.TRANSACTIONS_VIEW,
      },
    },
    '5': {
      options: {
        tabBarIconKey: TabBarIconKey.Setting,
        rootScreenName: Routes.SETTINGS_VIEW,
      },
    },
  };

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <TabBar
        state={state as TabNavigationState<ParamListBase>}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        descriptors={descriptors as any}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation={navigation as any}
      />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to the correct screen when a tab is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TabBar
        state={state as TabNavigationState<ParamListBase>}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        descriptors={descriptors as any}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation={navigation as any}
      />,
      { state: mockInitialState },
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Wallet}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Browser}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
    });

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Actions}`));
    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      {
        screen: Routes.MODAL.WALLET_ACTIONS,
      },
    );

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Activity}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);

    fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Setting}`));
    expect(navigation.navigate).toHaveBeenCalledWith(Routes.SETTINGS_VIEW, {
      screen: 'Settings',
    });
  });

  describe('Rewards navigation', () => {
    const rewardsState = {
      index: 0,
      routes: [{ key: '1', name: 'Tab 1' }],
    };
    const rewardsDescriptors = {
      '1': {
        options: {
          tabBarIconKey: TabBarIconKey.Rewards,
          rootScreenName: Routes.REWARDS_VIEW,
        },
      },
    };

    it('navigates to rewards when rewards are enabled', () => {
      // Mock useSelector to return true for rewards enabled
      mockUseSelector.mockImplementation((_selector) => true);

      const { getByTestId } = renderWithProvider(
        <TabBar
          state={rewardsState as TabNavigationState<ParamListBase>}
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          descriptors={rewardsDescriptors as any}
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigation={navigation as any}
        />,
        { state: mockInitialState },
      );

      fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Rewards}`));
      expect(navigation.navigate).toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });

    it('does not navigate to rewards when rewards are disabled', () => {
      // Mock rewards disabled
      mockUseSelector.mockImplementation((selector) => {
        if (selector.toString().includes('selectRewardsEnabledFlag')) {
          return false;
        }
        if (selector.toString().includes('selectChainId')) {
          return '0x1'; // Default chain ID
        }
        return selector(mockInitialState);
      });

      const { getByTestId } = renderWithProvider(
        <TabBar
          state={rewardsState as TabNavigationState<ParamListBase>}
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          descriptors={rewardsDescriptors as any}
          // TODO: Replace "any" with type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigation={navigation as any}
        />,
        { state: mockInitialState },
      );

      fireEvent.press(getByTestId(`tab-bar-item-${TabBarIconKey.Rewards}`));
      expect(navigation.navigate).not.toHaveBeenCalledWith(Routes.REWARDS_VIEW);
    });
  });
});
