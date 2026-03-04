import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { configureStore } from '@reduxjs/toolkit';
import RewardsSettingsView, {
  REWARDS_SETTINGS_SAFE_AREA_TEST_ID,
} from './RewardsSettingsView';
import type { OffDeviceAccount } from '../hooks/useLinkedOffDeviceAccounts';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => mockUseRoute(),
  };
});

<<<<<<< HEAD
// Mock react-native-safe-area-context (override SafeAreaView only; keep SafeAreaProvider etc. for stack)
jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('react-native-safe-area-context');
=======
// Mock theme
jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

// Mock getNavigationOptionsTitle
jest.mock('../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({ title: 'Settings' })),
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text } = jest.requireActual('react-native');
>>>>>>> 30bd473975 (test: migrate color-no-hex for rewards codeowner batch)
  return {
    ...actual,
    useSafeAreaInsets: jest.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
    SafeAreaView: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => React.createElement(View, { ...props, testID }, children),
  };
});

// Mock useTailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((styles) => (typeof styles === 'string' ? {} : styles)),
  }),
}));

// Mock RewardSettingsAccountGroupList component
jest.mock('../components/Settings/RewardSettingsAccountGroupList', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockRewardSettingsAccountGroupList() {
      const ReactActual = jest.requireActual('react');
      return ReactActual.createElement(
        View,
        { testID: 'reward-settings-account-group-list' },
        ReactActual.createElement(Text, null, 'Account Group List'),
      );
    },
  };
});

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.settings.title': 'Settings',
    };
    return translations[key] || key;
  }),
}));

// Mock ErrorBoundary
jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: function MockErrorBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return children;
  },
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  build: jest.fn(() => ({})),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    REWARDS_SETTINGS_VIEWED: 'REWARDS_SETTINGS_VIEWED',
  },
}));

// Mock selectors
jest.mock('../../../../selectors/rewards', () => ({}));

// Mock useLinkedOffDeviceAccounts hook
const mockUseLinkedOffDeviceAccounts = jest.fn<OffDeviceAccount[], []>(
  () => [],
);
jest.mock('../hooks/useLinkedOffDeviceAccounts', () => ({
  useLinkedOffDeviceAccounts: () => mockUseLinkedOffDeviceAccounts(),
}));

// Mock RewardsInfoBanner — pressable element that calls onConfirm
jest.mock('../components/RewardsInfoBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onConfirm,
      testID,
    }: {
      onConfirm?: () => void;
      testID?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(TouchableOpacity, {
        testID: testID ?? 'rewards-info-banner',
        onPress: onConfirm,
      }),
  };
});

// Mock LinkedOffDeviceAccountsSheet — renders with a close button for interaction tests
jest.mock('../components/Settings/LinkedOffDeviceAccountsSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onClose }: { accounts?: unknown[]; onClose?: () => void }) =>
      ReactActual.createElement(
        View,
        { testID: 'linked-off-device-accounts-sheet' },
        ReactActual.createElement(TouchableOpacity, {
          testID: 'close-sheet-button',
          onPress: onClose,
        }),
      ),
  };
});

describe('RewardsSettingsView', () => {
  let store: ReturnType<typeof configureStore>;
  const Stack = createStackNavigator();

  // Helper function to create mock store
  const createMockStore = () =>
    configureStore({
      reducer: {
        rewards: (
          state = {
            onboardingActiveStep: 'INTRO',
            candidateSubscriptionId: null,
          },
        ) => state,
        engine: (
          state = {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  selectedAccount: 'test-account-id',
                  accounts: {
                    'test-account-id': {
                      id: 'test-account-id',
                      address: '0x123',
                    },
                  },
                },
              },
              RewardsController: {
                activeAccount: null,
              },
            },
          },
        ) => state,
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    store = createMockStore();

    // Set default mock return values
    mockUseRoute.mockReturnValue({
      params: {},
    });

    // Default: no off-device accounts
    mockUseLinkedOffDeviceAccounts.mockReturnValue([]);
  });

  const renderWithNavigation = (component: React.ReactElement) =>
    render(
      <Provider store={store}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Test">{() => component}</Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>,
    );

  describe('Rendering', () => {
    it('renders successfully', () => {
      // Act
      const { getByTestId } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(
        getByTestId('reward-settings-account-group-list'),
      ).toBeOnTheScreen();
    });
  });

  describe('header and SafeAreaView', () => {
    it('renders SafeAreaView wrapper', () => {
      const { getByTestId } = renderWithNavigation(<RewardsSettingsView />);

      expect(getByTestId(REWARDS_SETTINGS_SAFE_AREA_TEST_ID)).toBeOnTheScreen();
    });

    it('renders HeaderCompactStandard with settings title', () => {
      const { getByText } = renderWithNavigation(<RewardsSettingsView />);

      expect(getByText('Settings')).toBeOnTheScreen();
    });

    it('calls navigation.goBack when back button is pressed', () => {
      const { getByTestId } = renderWithNavigation(<RewardsSettingsView />);
      const backButton = getByTestId('header-back-button');

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component structure', () => {
    it('renders account group list component', () => {
      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(
        getByTestId('reward-settings-account-group-list'),
      ).toBeOnTheScreen();
      expect(getByText('Account Group List')).toBeOnTheScreen();
    });

    it('renders component with proper styling', () => {
      // Act
      const component = renderWithNavigation(<RewardsSettingsView />);

      // Assert - Component should render without errors
      expect(component).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('handles undefined route params gracefully', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: undefined,
      });

      // Act
      const component = renderWithNavigation(<RewardsSettingsView />);

      // Assert - Should render without errors
      expect(component).toBeTruthy();
    });
  });

  describe('Metrics tracking', () => {
    it('tracks settings viewed event on mount', () => {
      renderWithNavigation(<RewardsSettingsView />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'REWARDS_SETTINGS_VIEWED',
      );
    });
  });

  describe('Off-device accounts banner', () => {
    it('does not render the banner when there are no off-device accounts', () => {
      // Arrange
      mockUseLinkedOffDeviceAccounts.mockReturnValue([]);

      // Act
      const { queryByTestId } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(queryByTestId('rewards-info-banner')).toBeNull();
    });

    it('renders the banner when off-device accounts exist', () => {
      // Arrange
      mockUseLinkedOffDeviceAccounts.mockReturnValue([
        {
          caip10: 'eip155:1:0x1234567890123456789012345678901234567890',
          caipChainId: 'eip155:1',
          address: '0x1234567890123456789012345678901234567890',
        },
      ]);

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(getByTestId('rewards-info-banner')).toBeOnTheScreen();
    });

    it('renders the banner for multiple off-device accounts', () => {
      // Arrange
      mockUseLinkedOffDeviceAccounts.mockReturnValue([
        {
          caip10: 'eip155:1:0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          caipChainId: 'eip155:1',
          address: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        },
        {
          caip10: 'eip155:1:0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          caipChainId: 'eip155:1',
          address: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        },
      ]);

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(getByTestId('rewards-info-banner')).toBeOnTheScreen();
    });
  });

  describe('Off-device accounts sheet', () => {
    const singleOffDeviceAccount = [
      {
        caip10: 'eip155:1:0x1234567890123456789012345678901234567890',
        caipChainId: 'eip155:1',
        address: '0x1234567890123456789012345678901234567890',
      },
    ];

    it('does not render the sheet on initial mount', () => {
      // Arrange
      mockUseLinkedOffDeviceAccounts.mockReturnValue(singleOffDeviceAccount);

      // Act
      const { queryByTestId } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(queryByTestId('linked-off-device-accounts-sheet')).toBeNull();
    });

    it('opens the sheet when the banner confirm button is pressed', () => {
      // Arrange
      mockUseLinkedOffDeviceAccounts.mockReturnValue(singleOffDeviceAccount);

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsSettingsView />);
      fireEvent.press(getByTestId('rewards-info-banner'));

      // Assert
      expect(getByTestId('linked-off-device-accounts-sheet')).toBeOnTheScreen();
    });

    it('closes the sheet when onClose is called', () => {
      // Arrange
      mockUseLinkedOffDeviceAccounts.mockReturnValue(singleOffDeviceAccount);
      const { getByTestId, queryByTestId } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Open the sheet
      fireEvent.press(getByTestId('rewards-info-banner'));
      expect(getByTestId('linked-off-device-accounts-sheet')).toBeOnTheScreen();

      // Act — close via the sheet's onClose callback
      fireEvent.press(getByTestId('close-sheet-button'));

      // Assert
      expect(queryByTestId('linked-off-device-accounts-sheet')).toBeNull();
    });

    it('can reopen the sheet after closing', () => {
      // Arrange
      mockUseLinkedOffDeviceAccounts.mockReturnValue(singleOffDeviceAccount);
      const { getByTestId, queryByTestId } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Open → close → reopen
      fireEvent.press(getByTestId('rewards-info-banner'));
      fireEvent.press(getByTestId('close-sheet-button'));
      expect(queryByTestId('linked-off-device-accounts-sheet')).toBeNull();

      fireEvent.press(getByTestId('rewards-info-banner'));
      expect(getByTestId('linked-off-device-accounts-sheet')).toBeOnTheScreen();
    });
  });
});
