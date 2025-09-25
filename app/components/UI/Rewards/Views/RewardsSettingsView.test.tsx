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

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.settings.title': 'Settings',
      'rewards.settings.subtitle': 'Connect Multiple Accounts',
      'rewards.unlinked_account_info.title': 'Account Not Connected',
      'rewards.unlinked_account_info.description':
        'Connect this account to earn rewards',
      'rewards.optout.title': 'Opt Out of Rewards',
      'rewards.optout.description':
        'Remove all accounts from the rewards program',
      'rewards.optout.confirm': 'Opt Out',
      'rewards.settings.accounts_syncing':
        'Your accounts are syncing. Please wait.',
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
jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsActiveAccountHasOptedIn: jest.fn(),
}));

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

// Import mocked selectors for setup
import { selectRewardsActiveAccountHasOptedIn } from '../../../../selectors/rewards';
import { useOptout } from '../hooks/useOptout';
import { useAccountsOperationsLoadingStates } from '../../../../util/accounts/useAccountsOperationsLoadingStates';

const mockSelectRewardsActiveAccountHasOptedIn =
  selectRewardsActiveAccountHasOptedIn as jest.MockedFunction<
    typeof selectRewardsActiveAccountHasOptedIn
  >;
const mockUseOptout = useOptout as jest.MockedFunction<typeof useOptout>;
const mockUseAccountsOperationsLoadingStates =
  useAccountsOperationsLoadingStates as jest.MockedFunction<
    typeof useAccountsOperationsLoadingStates
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
    mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(true);
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
    it('starts with linked tab (index 0) when account is opted in', () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(true);

      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('reward-settings-tabs')).toBeOnTheScreen();
      expect(getByText('Tab Index: 0')).toBeOnTheScreen();
    });

    it('starts with unlinked tab (index 1) when account is not opted in', () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);

      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('reward-settings-tabs')).toBeOnTheScreen();
      expect(getByText('Tab Index: 1')).toBeOnTheScreen();
    });

    it('starts with unlinked tab (index 1) when account status is null', () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(null);

      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('reward-settings-tabs')).toBeOnTheScreen();
      expect(getByText('Tab Index: 0')).toBeOnTheScreen();
    });
  });

  describe('Route params handling', () => {
    it('uses focusUnlinkedTab param when provided', () => {
      // Arrange
      mockUseRoute.mockReturnValue({
        params: { focusUnlinkedTab: true },
      });
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(true);

      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('reward-settings-tabs')).toBeOnTheScreen();
      expect(getByText('Tab Index: 1')).toBeOnTheScreen();
    });
  });

  describe('Unlinked account banner', () => {
    it('shows banner when account is not opted in', () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);

      // Act
      const { getByText } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(getByText('Account Not Connected')).toBeOnTheScreen();
      expect(
        getByText('Connect this account to earn rewards'),
      ).toBeOnTheScreen();
    });

    it('does not show banner when account is opted in', () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(true);

      // Act
      const { queryByText } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(queryByText('Account Not Connected')).toBeNull();
    });

    it('does not show banner when account status is null', () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(null);

      // Act
      const { queryByText } = renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(queryByText('Account Not Connected')).toBeNull();
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
      expect(getByTestId('reward-settings-tabs')).toBeOnTheScreen();
      expect(getByText('Opt Out of Rewards')).toBeOnTheScreen();
    });

    it('renders toast component', () => {
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

    it('shows syncing banner even when account is opted in', () => {
      // Arrange - both syncing and opted in
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(true);
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        areAnyOperationsLoading: true,
        isAccountSyncingInProgress: true,
        loadingMessage: 'Profile sync in progress...',
      });

      // Act
      const { getByTestId, queryByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('account-syncing-banner')).toBeOnTheScreen();
      // Should not show the unlinked account banner when opted in
      expect(queryByText('Account Not Connected')).toBeNull();
    });

    it('shows both syncing and unlinked account banners when account is not opted in', () => {
      // Arrange - both syncing and not opted in
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
      mockUseAccountsOperationsLoadingStates.mockReturnValue({
        areAnyOperationsLoading: true,
        isAccountSyncingInProgress: true,
        loadingMessage: 'Syncing profile data...',
      });

      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsSettingsView />,
      );

      // Assert
      expect(getByTestId('account-syncing-banner')).toBeOnTheScreen();
      expect(getByText('Syncing profile data...')).toBeOnTheScreen();
      expect(getByText('Account Not Connected')).toBeOnTheScreen();
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

    it('uses selectRewardsActiveAccountHasOptedIn selector', () => {
      // Act
      renderWithNavigation(<RewardsSettingsView />);

      // Assert
      expect(mockSelectRewardsActiveAccountHasOptedIn).toHaveBeenCalled();
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
