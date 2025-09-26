import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { configureStore } from '@reduxjs/toolkit';
import RewardsNavigator from './RewardsNavigator';
import Routes from '../../../constants/navigation/Routes';
import { OnboardingStep } from '../../../actions/rewards';

// Mock Engine
jest.mock('../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

// Mock dependencies
jest.mock('./hooks/useOptIn');
jest.mock('./OnboardingNavigator', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockOnboardingNavigator() {
    return React.createElement(
      View,
      { testID: 'onboarding-navigator' },
      React.createElement(Text, null, 'Onboarding Navigator'),
    );
  };
});
jest.mock('./Views/RewardsDashboard', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockRewardsDashboard() {
    return React.createElement(
      View,
      { testID: 'rewards-dashboard' },
      React.createElement(Text, null, 'Rewards Dashboard'),
    );
  };
});
jest.mock('./Views/RewardsReferralView', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockReferralRewardsView() {
    return React.createElement(
      View,
      { testID: 'referral-rewards-view' },
      React.createElement(Text, null, 'Referral Rewards View'),
    );
  };
});

// Mock Skeleton component
jest.mock('../../../component-library/components/Skeleton/Skeleton', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockSkeleton({
    width,
    height,
  }: {
    width: string;
    height: string;
  }) {
    return React.createElement(View, {
      testID: 'skeleton-loader',
      style: { width, height },
    });
  };
});

// Mock BannerAlert
jest.mock(
  '../../../component-library/components/Banners/Banner/variants/BannerAlert',
  () => {
    const React = jest.requireActual('react');
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return function MockBannerAlert({
      title,
      description,
      actionButtonProps,
    }: {
      title: string;
      description: string;
      actionButtonProps?: {
        label: string;
        onPress: () => void;
      };
    }) {
      return React.createElement(
        View,
        { testID: 'banner-alert' },
        React.createElement(Text, { testID: 'banner-title' }, title),
        React.createElement(
          Text,
          { testID: 'banner-description' },
          description,
        ),
        actionButtonProps &&
          React.createElement(
            TouchableOpacity,
            {
              testID: 'banner-action-button',
              onPress: actionButtonProps.onPress,
            },
            React.createElement(Text, null, actionButtonProps.label),
          ),
      );
    };
  },
);

// Mock ErrorBoundary
jest.mock('../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: function MockErrorBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return children;
  },
}));

// Mock theme
jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      background: '#fff',
    },
  }),
}));

// Mock getNavigationOptionsTitle
jest.mock('../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({ title: 'Rewards' })),
}));

// Mock i18n
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.main_title': 'Rewards',
      'rewards.auth_fail_title': 'Authentication Failed',
      'rewards.auth_fail_description': 'Please try again later',
      'navigation.back': 'Back',
    };
    return translations[key] || key;
  }),
}));

// Mock selectors
jest.mock('../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: () => ({
    id: 'test-account-id',
    address: '0x123',
  }),
}));

jest.mock('../../../selectors/rewards', () => ({
  selectRewardsActiveAccountHasOptedIn: jest.fn(),
  selectRewardsSubscriptionId: jest.fn(),
}));

// Mock react-navigation/native hooks
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockIsFocused = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
    useIsFocused: () => mockIsFocused(),
  };
});

// Mock useCandidateSubscriptionId hook
jest.mock('./hooks/useCandidateSubscriptionId', () => ({
  useCandidateSubscriptionId: jest.fn(),
}));

// Import mocked selectors for setup
import {
  selectRewardsActiveAccountHasOptedIn,
  selectRewardsSubscriptionId,
} from '../../../selectors/rewards';

const mockSelectRewardsActiveAccountHasOptedIn =
  selectRewardsActiveAccountHasOptedIn as jest.MockedFunction<
    typeof selectRewardsActiveAccountHasOptedIn
  >;
const mockSelectRewardsSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;

describe('RewardsNavigator', () => {
  let store: ReturnType<typeof configureStore>;
  const Stack = createStackNavigator();

  beforeEach(() => {
    jest.clearAllMocks();

    // Set default mock return values
    mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(null);
    mockSelectRewardsSubscriptionId.mockReturnValue(null);

    // Create a mock store
    store = configureStore({
      reducer: {
        rewards: (
          state = {
            onboardingActiveStep: OnboardingStep.INTRO,
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

    // Default to focused
    mockIsFocused.mockReturnValue(true);
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

  describe('Focus optimization', () => {
    it('renders empty component when not focused', () => {
      // Arrange
      mockIsFocused.mockReturnValue(false);

      // Act
      const { queryByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert - should not render any of the main content components
      expect(queryByTestId('rewards-dashboard')).toBeNull();
      expect(queryByTestId('onboarding-navigator')).toBeNull();
      expect(queryByTestId('skeleton-loader')).toBeNull();
      expect(queryByTestId('banner-alert')).toBeNull();
    });

    it('renders content when focused', () => {
      // Arrange
      mockIsFocused.mockReturnValue(true);
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert
      expect(getByTestId('onboarding-navigator')).toBeOnTheScreen();
    });
  });

  describe('Authentication states', () => {
    beforeEach(() => {
      mockIsFocused.mockReturnValue(true);
    });

    it('renders error view when subscription state is error', async () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
      mockSelectRewardsSubscriptionId.mockReturnValue('error');

      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsNavigator />,
      );

      // Assert
      await waitFor(() => {
        expect(getByTestId('banner-alert')).toBeOnTheScreen();
        expect(getByText('Authentication Failed')).toBeOnTheScreen();
        expect(getByText('Please try again later')).toBeOnTheScreen();
      });
    });

    it('renders dashboard when user has opted in', async () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(true);
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-dashboard')).toBeOnTheScreen();
      });
    });

    it('renders onboarding when user has not opted in', async () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('onboarding-navigator')).toBeOnTheScreen();
      });
    });
  });

  describe('Navigation routing logic', () => {
    beforeEach(() => {
      mockIsFocused.mockReturnValue(true);
    });

    it('routes to dashboard when user has opted in with subscription ID', async () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(true);
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-dashboard')).toBeOnTheScreen();
      });
    });

    it('routes to onboarding when user has not opted in and no candidate ID', async () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('onboarding-navigator')).toBeOnTheScreen();
      });
    });
  });

  describe('Navigation structure', () => {
    beforeEach(() => {
      mockIsFocused.mockReturnValue(true);
    });

    it('sets up correct routes when user has opted in', async () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(true);
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-dashboard')).toBeOnTheScreen();
      });
    });

    it('sets up onboarding route when user has not opted in', async () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('onboarding-navigator')).toBeOnTheScreen();
      });
    });

    it('determines initial route correctly for opted-in users', () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(true);
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert - Component should use selectors (tested indirectly through rendered content)
      expect(mockSelectRewardsActiveAccountHasOptedIn).toHaveBeenCalled();
      expect(mockSelectRewardsSubscriptionId).toHaveBeenCalled();
    });

    it('determines initial route correctly for non-opted-in users', () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert - Component should use selectors (tested indirectly through rendered content)
      expect(mockSelectRewardsActiveAccountHasOptedIn).toHaveBeenCalled();
      expect(mockSelectRewardsSubscriptionId).toHaveBeenCalled();
    });
  });

  describe('AuthErrorView sub-component', () => {
    it('renders error banner with correct content', async () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
      mockSelectRewardsSubscriptionId.mockReturnValue('error');

      // Act
      const { getByTestId, getByText } = renderWithNavigation(
        <RewardsNavigator />,
      );

      // Assert
      await waitFor(() => {
        expect(getByTestId('banner-alert')).toBeOnTheScreen();
        expect(getByText('Authentication Failed')).toBeOnTheScreen();
        expect(getByText('Please try again later')).toBeOnTheScreen();
        expect(getByText('Back')).toBeOnTheScreen();
      });
    });

    it('navigates to wallet home when back button is pressed', async () => {
      // Arrange
      mockSelectRewardsActiveAccountHasOptedIn.mockReturnValue(false);
      mockSelectRewardsSubscriptionId.mockReturnValue('error');

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(getByTestId('banner-action-button')).toBeOnTheScreen();
      });

      fireEvent.press(getByTestId('banner-action-button'));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith('Home', {
        screen: Routes.WALLET.HOME,
      });
    });
  });
});
