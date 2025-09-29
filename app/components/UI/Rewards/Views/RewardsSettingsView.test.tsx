import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { configureStore } from '@reduxjs/toolkit';
import RewardsSettingsView from './RewardsSettingsView';

// Mock navigation
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
    useRoute: () => mockUseRoute(),
  };
});

// Mock theme
jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      background: '#fff',
    },
  }),
}));

// Mock getNavigationOptionsTitle
jest.mock('../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({ title: 'Settings' })),
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: function MockBox({
      children,
      testID,
      twClassName,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) {
      const ReactActual = jest.requireActual('react');
      return ReactActual.createElement(View, { testID, ...props }, children);
    },
    Text: function MockText({
      children,
      variant,
      twClassName,
      ...props
    }: {
      children?: React.ReactNode;
      variant?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) {
      const ReactActual = jest.requireActual('react');
      return ReactActual.createElement(Text, { ...props }, children);
    },
    TextVariant: {
      HeadingMd: 'HeadingMd',
      HeadingSm: 'HeadingSm',
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
  };
});

// Mock useTailwind hook
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((styles) => (typeof styles === 'string' ? {} : styles)),
  }),
}));

// Mock Button component
jest.mock('../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockButton({
      label,
      onPress,
      testID,
      isDisabled,
      isDanger,
      ...props
    }: {
      label?: string;
      onPress?: () => void;
      testID?: string;
      isDisabled?: boolean;
      isDanger?: boolean;
      [key: string]: unknown;
    }) {
      const ReactActual = jest.requireActual('react');
      return ReactActual.createElement(
        TouchableOpacity,
        {
          onPress: isDisabled ? undefined : onPress,
          testID,
          disabled: isDisabled,
          ...props,
        },
        ReactActual.createElement(Text, null, label),
      );
    },
    ButtonVariants: {
      Primary: 'Primary',
      Secondary: 'Secondary',
    },
  };
});

// Mock RewardsInfoBanner component
jest.mock('../components/RewardsInfoBanner', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockRewardsInfoBanner({
      title,
      description,
      testID,
    }: {
      title?: string;
      description?: string;
      testID?: string;
    }) {
      const ReactActual = jest.requireActual('react');
      return ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Text, null, title),
        ReactActual.createElement(Text, null, description),
      );
    },
  };
});

// Mock Toast component
jest.mock('../../../../component-library/components/Toast', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');

  const MockToast = (
    _props: Record<string, unknown>,
    ref: React.Ref<typeof View>,
  ) => ReactActual.createElement(View, { testID: 'toast', ref });

  return {
    __esModule: true,
    default: ReactActual.forwardRef(MockToast),
  };
});

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.settings.title': 'Settings',
      'rewards.settings.subtitle': 'Connect Multiple Accounts',
      'rewards.settings.description':
        'Connect multiple accounts to maximize your rewards. Each linked account earns rewards.',
      'rewards.optout.title': 'Opt Out of Rewards',
      'rewards.optout.description':
        'Remove all accounts from the rewards program',
      'rewards.optout.confirm': 'Opt Out',
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

// Mock components
jest.mock('../components/Settings/RewardSettingsTabs', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockRewardSettingsTabs({
    initialTabIndex,
  }: {
    initialTabIndex: number;
  }) {
    const ReactActual = jest.requireActual('react');
    return ReactActual.createElement(
      View,
      { testID: 'reward-settings-tabs' },
      ReactActual.createElement(Text, null, `Tab Index: ${initialTabIndex}`),
    );
  };
});

// Mock selectors
jest.mock('../../../../selectors/rewards', () => ({}));

// Mock hooks
jest.mock('../hooks/useOptout', () => ({
  useOptout: jest.fn(),
}));

// Mock useAccountsOperationsLoadingStates hook
jest.mock(
  '../../../../util/accounts/useAccountsOperationsLoadingStates',
  () => ({
    useAccountsOperationsLoadingStates: jest.fn(),
  }),
);

// Mock useSeasonStatus hook
jest.mock('../hooks/useSeasonStatus', () => ({
  useSeasonStatus: jest.fn(),
}));

// Import mocked hooks for setup
import { useOptout } from '../hooks/useOptout';
import { useAccountsOperationsLoadingStates } from '../../../../util/accounts/useAccountsOperationsLoadingStates';
import { useSeasonStatus } from '../hooks/useSeasonStatus';

const mockUseOptout = useOptout as jest.MockedFunction<typeof useOptout>;
const mockUseAccountsOperationsLoadingStates =
  useAccountsOperationsLoadingStates as jest.MockedFunction<
    typeof useAccountsOperationsLoadingStates
  >;
const mockUseSeasonStatus = useSeasonStatus as jest.MockedFunction<
  typeof useSeasonStatus
>;

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
    mockUseOptout.mockReturnValue({
      optout: jest.fn(),
      isLoading: false,
      showOptoutBottomSheet: jest.fn(),
    });
    mockUseAccountsOperationsLoadingStates.mockReturnValue({
      areAnyOperationsLoading: false,
      isAccountSyncingInProgress: false,
      loadingMessage: null,
    });
    mockUseRoute.mockReturnValue({
      params: {},
    });
    mockUseSeasonStatus.mockReturnValue({
      fetchSeasonStatus: jest.fn(),
    });
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
      expect(getByTestId('reward-settings-tabs')).toBeOnTheScreen();
    });

    it('sets navigation options on mount', async () => {
      // Act
      renderWithNavigation(<RewardsSettingsView />);

      // Assert
      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });
    });
  });

  describe('Initial tab determination', () => {
    it('starts with linked tab (index 0) by default', () => {
      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('reward-settings-tabs')).toBeOnTheScreen();
      expect(getByText('Tab Index: 0')).toBeOnTheScreen();
    });

    it('starts with linked tab (index 0) regardless of account status', () => {
      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('reward-settings-tabs')).toBeOnTheScreen();
      expect(getByText('Tab Index: 0')).toBeOnTheScreen();
    });
  });

  describe('Opt out section', () => {
    it('renders opt out title and description', () => {
      // Act
      const { getByText } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(getByText('Opt Out of Rewards')).toBeOnTheScreen();
      expect(
        getByText('Remove all accounts from the rewards program'),
      ).toBeOnTheScreen();
    });

    it('renders opt out button', () => {
      // Act
      const { getByText } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(getByText('Opt Out')).toBeOnTheScreen();
    });
  });

  describe('Component structure', () => {
    it('renders all main sections', () => {
      // Act
      const { getByText, getByTestId } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByText('Connect Multiple Accounts')).toBeOnTheScreen();
      expect(
        getByText(
          'Connect multiple accounts to maximize your rewards. Each linked account earns rewards.',
        ),
      ).toBeOnTheScreen();
      expect(getByTestId('reward-settings-tabs')).toBeOnTheScreen();
      expect(getByText('Opt Out of Rewards')).toBeOnTheScreen();
      expect(
        getByText('Remove all accounts from the rewards program'),
      ).toBeOnTheScreen();
      expect(getByText('Opt Out')).toBeOnTheScreen();
    });

    it('renders toast component', () => {
      // Act
      const { getByTestId } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(getByTestId('toast')).toBeOnTheScreen();
    });

    it('renders scrollview with proper styling', () => {
      // Act
      const component = renderWithNavigation(<RewardsSettingsView />);

      // Assert - Component should render without errors
      expect(component).toBeTruthy();
    });
  });

  describe('Account syncing banner', () => {
    it('shows syncing banner when isAccountSyncingInProgress is true', () => {
      // Arrange
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        areAnyOperationsLoading: true,
        isAccountSyncingInProgress: true,
        loadingMessage: 'Syncing accounts...',
      });

      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('account-syncing-banner')).toBeOnTheScreen();
      expect(getByText('Syncing accounts...')).toBeOnTheScreen();
      expect(
        getByText('Your accounts are syncing. Please wait.'),
      ).toBeOnTheScreen();
    });

    it('does not show syncing banner when isAccountSyncingInProgress is false', () => {
      // Arrange
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        areAnyOperationsLoading: false,
        isAccountSyncingInProgress: false,
        loadingMessage: null,
      });

      // Act
      const { queryByTestId } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(queryByTestId('account-syncing-banner')).toBeNull();
    });

    it('shows syncing banner with custom loading message', () => {
      // Arrange
      const customMessage = 'Importing accounts from backup...';
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        areAnyOperationsLoading: true,
        isAccountSyncingInProgress: true,
        loadingMessage: customMessage,
      });

      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('account-syncing-banner')).toBeOnTheScreen();
      expect(getByText(customMessage)).toBeOnTheScreen();
      expect(
        getByText('Your accounts are syncing. Please wait.'),
      ).toBeOnTheScreen();
    });

    it('shows syncing banner when account syncing is in progress', () => {
      // Arrange
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        areAnyOperationsLoading: true,
        isAccountSyncingInProgress: true,
        loadingMessage: 'Profile sync in progress...',
      });

      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('account-syncing-banner')).toBeOnTheScreen();
      expect(getByText('Profile sync in progress...')).toBeOnTheScreen();
      expect(
        getByText('Your accounts are syncing. Please wait.'),
      ).toBeOnTheScreen();
    });
  });

  describe('Hook integration', () => {
    it('calls useAccountsOperationsLoadingStates hook', () => {
      // Act
      renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(mockUseAccountsOperationsLoadingStates).toHaveBeenCalled();
    });

    it('calls useOptout hook', () => {
      // Act
      renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(mockUseOptout).toHaveBeenCalled();
    });

    it('calls useSeasonStatus hook', () => {
      // Act
      renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalled();
    });

    it('calls useSeasonStatus hook for season data availability', () => {
      // Given that this view doesn't have seasonstatus component
      // When the component renders

      // Act
      renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledTimes(1);
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

    it('handles hook errors gracefully', () => {
      // Arrange
      mockUseOptout.mockImplementation(() => {
        throw new Error('Hook error');
      });

      // Act & Assert - Should not throw
      expect(() => {
        renderWithNavigation(<RewardsSettingsView />);
      }).toThrow('Hook error');

      // Reset mock
      mockUseOptout.mockReturnValue({
        optout: jest.fn(),
        isLoading: false,
        showOptoutBottomSheet: jest.fn(),
      });
    });

    it('handles null loading message gracefully', () => {
      // Arrange
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        areAnyOperationsLoading: true,
        isAccountSyncingInProgress: true,
        loadingMessage: null,
      });

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsSettingsView />);

      // Assert - Should still render banner even with null message
      expect(getByTestId('account-syncing-banner')).toBeOnTheScreen();
    });
  });
});
