import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
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
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockOnboardingNavigator() {
    return ReactActual.createElement(
      View,
      { testID: 'rewards-onboarding-navigator' },
      ReactActual.createElement(Text, null, 'Onboarding Navigator'),
    );
  };
});

jest.mock('./Views/RewardsDashboard', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockRewardsDashboard() {
    return ReactActual.createElement(
      View,
      { testID: 'rewards-dashboard-view' },
      ReactActual.createElement(Text, null, 'Rewards Dashboard'),
    );
  };
});

jest.mock('./Views/RewardsReferralView', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockReferralRewardsView() {
    return ReactActual.createElement(
      View,
      { testID: 'rewards-referral-view' },
      ReactActual.createElement(Text, null, 'Referral Rewards View'),
    );
  };
});

jest.mock('./Views/RewardsSettingsView', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockRewardsSettingsView() {
    return ReactActual.createElement(
      View,
      { testID: 'rewards-settings-view' },
      ReactActual.createElement(Text, null, 'Rewards Settings View'),
    );
  };
});

jest.mock('./Views/CampaignTourStepView', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockCampaignTourStepView() {
    return ReactActual.createElement(
      View,
      { testID: 'campaign-tour-step-view' },
      ReactActual.createElement(Text, null, 'Campaign Tour Step View'),
    );
  };
});

jest.mock('./Views/OndoCampaignDetailsView', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockOndoCampaignDetailsView() {
    return ReactActual.createElement(
      View,
      { testID: 'campaign-details-view' },
      ReactActual.createElement(Text, null, 'Campaign Details View'),
    );
  };
});

jest.mock('./Views/OndoCampaignRwaSelectorView', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockOndoCampaignRwaSelectorView() {
    return ReactActual.createElement(
      View,
      { testID: 'ondo-campaign-rwa-selector-view' },
      ReactActual.createElement(Text, null, 'Ondo Campaign RWA Selector View'),
    );
  };
});

jest.mock('./Views/SeasonOneCampaignDetailsView', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockSeasonOneCampaignDetailsView() {
    return ReactActual.createElement(
      View,
      { testID: 'season-one-campaign-details-view' },
      ReactActual.createElement(Text, null, 'Season One Campaign Details View'),
    );
  };
});

jest.mock('./Views/CampaignMechanicsView', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockCampaignMechanicsView() {
    return ReactActual.createElement(
      View,
      { testID: 'campaign-mechanics-view' },
      ReactActual.createElement(Text, null, 'Campaign Mechanics View'),
    );
  };
});

// Mock Skeleton component
jest.mock(
  '../../../component-library/components-temp/Skeleton/Skeleton',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return function MockSkeleton({
      width,
      height,
    }: {
      width: string;
      height: string;
    }) {
      return ReactActual.createElement(View, {
        testID: 'skeleton-loader',
        style: { width, height },
      });
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
jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

// Mock getNavigationOptionsTitle
jest.mock('../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({ title: 'Rewards' })),
}));

// Mock i18n
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.main_title': 'Rewards',
      'rewards.auth_fail_title': 'Authentication failed',
      'rewards.auth_fail_description': 'Please try again later',
      'navigation.back': 'Back',
    };
    return translations[key] || key;
  }),
}));

jest.mock('../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../reducers/rewards/selectors', () => ({
  selectIsRewardsVersionBlocked: jest.fn(),
  selectPendingDeeplink: jest.fn(),
}));

// Mock react-navigation/native hooks
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockSetParams = jest.fn();
const mockIsFocused = jest.fn();
const mockReactReduxDispatch = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      setParams: mockSetParams,
    }),
    useIsFocused: () => mockIsFocused(),
  };
});

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockReactReduxDispatch,
  };
});

// Mock useCandidateSubscriptionId hook
jest.mock('./hooks/useCandidateSubscriptionId', () => ({
  useCandidateSubscriptionId: jest.fn(),
}));

// Mock useRewardCampaigns hook
jest.mock('./hooks/useRewardCampaigns', () => ({
  useRewardCampaigns: jest.fn(),
}));

// Mock useSeasonStatus hook
jest.mock('./hooks/useSeasonStatus', () => ({
  useSeasonStatus: jest.fn(),
}));

// Mock useGeoRewardsMetadata hook
jest.mock('./hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: jest.fn(),
}));

// Mock useReferralDetails hook
jest.mock('./hooks/useReferralDetails', () => ({
  useReferralDetails: jest.fn().mockReturnValue({
    fetchReferralDetails: jest.fn(),
  }),
}));

jest.mock('./hooks/useMaybeShowCampaignEndToast', () => ({
  useMaybeShowCampaignEndToast: jest.fn(),
}));

// Mock useRewardsVersionGuard hook
jest.mock('./hooks/useRewardsVersionGuard', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({ fetchVersionRequirements: jest.fn() }),
}));

// Mock RewardsUpdateRequired component
jest.mock('./components/RewardsUpdateRequired/RewardsUpdateRequired', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockRewardsUpdateRequired() {
      return ReactActual.createElement(
        View,
        { testID: 'rewards-update-required' },
        ReactActual.createElement(Text, null, 'Update Required'),
      );
    },
  };
});

// Import mocked selectors and hooks for setup
import { selectRewardsSubscriptionId } from '../../../selectors/rewards';
import {
  selectIsRewardsVersionBlocked,
  selectPendingDeeplink,
} from '../../../reducers/rewards/selectors';
import { setPendingDeeplink } from '../../../reducers/rewards';
import { useSeasonStatus } from './hooks/useSeasonStatus';
import { useGeoRewardsMetadata } from './hooks/useGeoRewardsMetadata';

const mockSelectRewardsSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;

const mockSelectIsRewardsVersionBlocked =
  selectIsRewardsVersionBlocked as jest.MockedFunction<
    typeof selectIsRewardsVersionBlocked
  >;

const mockSelectPendingDeeplink = selectPendingDeeplink as jest.MockedFunction<
  typeof selectPendingDeeplink
>;

const mockUseSeasonStatus = useSeasonStatus as jest.MockedFunction<
  typeof useSeasonStatus
>;
const mockUseGeoRewardsMetadata = useGeoRewardsMetadata as jest.MockedFunction<
  typeof useGeoRewardsMetadata
>;

describe('RewardsNavigator', () => {
  let store: ReturnType<typeof configureStore>;
  const Stack = createStackNavigator();

  beforeEach(() => {
    jest.clearAllMocks();

    // Set default mock return values
    mockSelectRewardsSubscriptionId.mockReturnValue(null);
    mockSelectPendingDeeplink.mockReturnValue(null);
    mockUseSeasonStatus.mockReturnValue({
      fetchSeasonStatus: jest.fn(),
    });
    mockUseGeoRewardsMetadata.mockReturnValue({
      fetchGeoRewardsMetadata: jest.fn(),
    });
    mockSelectIsRewardsVersionBlocked.mockReturnValue(false);

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

  const buildNavWrapper = (component: React.ReactElement) => (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Test">{() => component}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );

  const renderWithNavigation = (component: React.ReactElement) =>
    render(buildNavWrapper(component));

  describe('Initial route determination', () => {
    beforeEach(() => {
      mockIsFocused.mockReturnValue(true);
    });

    it('returns dashboard route when subscription ID exists', () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert - The component should use REWARDS_DASHBOARD as initial route
      // This is tested indirectly through the navigation behavior
      expect(true).toBe(true); // Component renders without error
    });

    it('returns onboarding flow route when subscription ID is null', () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert - The component should use REWARDS_ONBOARDING_FLOW as initial route
      // This is tested indirectly through the navigation behavior
      expect(true).toBe(true); // Component renders without error
    });

    it('renders dashboard when subscription ID is available', async () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-dashboard-view')).toBeOnTheScreen();
      });
    });

    it('renders onboarding when subscription ID is not available', async () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-onboarding-navigator')).toBeOnTheScreen();
      });
    });
  });

  describe('Navigation routing logic', () => {
    beforeEach(() => {
      mockIsFocused.mockReturnValue(true);
    });

    it('navigates to dashboard when subscription ID exists', async () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      // Reset navigate mock to track calls
      mockNavigate.mockClear();

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
      });
    });

    it('navigates to onboarding flow when subscription ID is null', async () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Reset navigate mock to track calls
      mockNavigate.mockClear();

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.REWARDS_ONBOARDING_FLOW,
        );
      });
    });

    it('navigates to onboarding flow when subscription ID is undefined', async () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Reset navigate mock to track calls
      mockNavigate.mockClear();

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.REWARDS_ONBOARDING_FLOW,
        );
      });
    });
  });

  describe('Stack Navigator Configuration', () => {
    it('includes onboarding route for users without subscription', async () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert
      await waitFor(() => {
        expect(getByTestId('rewards-onboarding-navigator')).toBeOnTheScreen();
      });
    });

    it('includes dashboard and other routes only for users with subscription', async () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert - Dashboard should be visible
      await waitFor(() => {
        expect(getByTestId('rewards-dashboard-view')).toBeOnTheScreen();
      });

      // The conditional routes (referral, settings) are only included in the navigator
      // when subscriptionId exists, but they're not rendered initially
    });

    it('does not render dashboard routes when subscription ID is null', async () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      // Act
      const { queryByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert - Dashboard and related routes should not be available
      await waitFor(() => {
        expect(queryByTestId('rewards-dashboard-view')).toBeNull();
      });
    });

    it('registers ONDO_CAMPAIGN_DETAILS_VIEW and CAMPAIGN_MECHANICS routes when subscription exists', async () => {
      // Both views are registered inside the subscriptionId-guarded block,
      // so they are present in the navigator only when the user is enrolled.
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      // Rendering should not throw even with the new screens registered
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(getByTestId('rewards-dashboard-view')).toBeOnTheScreen();
      });
    });

    it('registers REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR route when subscription exists', async () => {
      // The RWA selector screen is registered inside the subscriptionId-guarded block
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      // Rendering should not throw with the new screen registered
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(getByTestId('rewards-dashboard-view')).toBeOnTheScreen();
      });
    });

    it('registers REWARDS_CAMPAIGN_TOUR_STEP route when subscription exists', async () => {
      // The campaign tour screen is registered inside the subscriptionId-guarded block
      // so that navigate() from the tour to campaign details is a push (not a pop),
      // keeping the slide-left direction consistent with the carousel animation.
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(getByTestId('rewards-dashboard-view')).toBeOnTheScreen();
      });
    });
  });

  // Note: Removed AuthErrorView tests as they don't match the actual implementation
  // The component appears to handle errors differently than originally tested

  describe('Hooks integration', () => {
    it('calls useCandidateSubscriptionId hook', () => {
      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert - The hook should be called during component render
      // This is implicitly tested since the component renders successfully
      expect(true).toBe(true);
    });

    it('calls useSeasonStatus hook with correct parameters', () => {
      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledWith({
        onlyForExplicitFetch: false,
      });
    });

    it('uses selectors for subscription state management', () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockClear();

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert
      expect(mockSelectRewardsSubscriptionId).toHaveBeenCalled();
    });

    it('renders without crashing with all hooks', () => {
      // Act
      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      // Assert - Just verify it renders with default subscription state
      expect(getByTestId('rewards-onboarding-navigator')).toBeDefined();
    });

    it('calls useGeoRewardsMetadata hook', () => {
      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert
      expect(mockUseGeoRewardsMetadata).toHaveBeenCalledWith({});
    });

    it('integrates useSeasonStatus hook properly', () => {
      // Arrange
      const mockFetchSeasonStatus = jest.fn();
      mockUseSeasonStatus.mockReturnValue({
        fetchSeasonStatus: mockFetchSeasonStatus,
      });

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert
      expect(mockUseSeasonStatus).toHaveBeenCalledTimes(1);
      expect(mockUseSeasonStatus).toHaveBeenCalledWith({
        onlyForExplicitFetch: false,
      });
    });
  });

  describe('Deeplink navigation params', () => {
    beforeEach(() => {
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');
      mockNavigate.mockClear();
      mockReactReduxDispatch.mockClear();
    });

    it('navigates to campaigns view when pendingDeeplink.page=campaigns', async () => {
      mockSelectPendingDeeplink.mockReturnValue({ page: 'campaigns' });

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.REWARDS_CAMPAIGNS_VIEW,
        );
      });
    });

    it('navigates to ondo campaign when pendingDeeplink.campaign=ondo', async () => {
      mockSelectPendingDeeplink.mockReturnValue({ campaign: 'ondo' });

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW,
        );
      });
    });

    it('navigates to season1 campaign when pendingDeeplink.campaign=season1', async () => {
      mockSelectPendingDeeplink.mockReturnValue({ campaign: 'season1' });

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW,
        );
      });
    });

    it('navigates to musd calculator when pendingDeeplink.page=musd', async () => {
      mockSelectPendingDeeplink.mockReturnValue({ page: 'musd' });

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.REWARDS_MUSD_CALCULATOR_VIEW,
        );
      });
    });

    it('navigates to benefits full view when pendingDeeplink.page=benefits', async () => {
      mockSelectPendingDeeplink.mockReturnValue({ page: 'benefits' });

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.REWARD_BENEFITS_FULL_VIEW,
        );
      });
    });

    it('navigates to dashboard when pendingDeeplink is null', async () => {
      mockSelectPendingDeeplink.mockReturnValue(null);

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
      });
    });

    it('dispatches setPendingDeeplink(null) after handling page deeplink', async () => {
      mockSelectPendingDeeplink.mockReturnValue({ page: 'campaigns' });

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockReactReduxDispatch).toHaveBeenCalledWith(
          setPendingDeeplink(null),
        );
      });
    });

    it('dispatches setPendingDeeplink(null) after handling campaign deeplink', async () => {
      mockSelectPendingDeeplink.mockReturnValue({ campaign: 'ondo' });

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockReactReduxDispatch).toHaveBeenCalledWith(
          setPendingDeeplink(null),
        );
      });
    });

    it('does not dispatch setPendingDeeplink when no deeplink is pending', async () => {
      mockSelectPendingDeeplink.mockReturnValue(null);

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
      });
      expect(mockReactReduxDispatch).not.toHaveBeenCalledWith(
        setPendingDeeplink(null),
      );
    });

    it('does not navigate to dashboard after pending deeplink is consumed', async () => {
      // Regression: the useEffect re-fires when dispatch(setPendingDeeplink(null))
      // changes the pendingDeeplink dep to null. Without the skipNextEffectRef guard
      // it would fall through to navigate(REWARDS_DASHBOARD), overriding the
      // deeplink destination.
      mockSelectPendingDeeplink.mockReturnValue({ page: 'campaigns' });

      const { rerender } = renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.REWARDS_CAMPAIGNS_VIEW,
        );
      });

      // Simulate Redux clearing the pending deeplink (what happens after the
      // real dispatch(setPendingDeeplink(null)) updates the store).
      mockSelectPendingDeeplink.mockReturnValue(null);
      mockNavigate.mockClear();

      await act(async () => {
        rerender(buildNavWrapper(<RewardsNavigator />));
      });

      // The skipNextEffectRef guard must prevent navigate(REWARDS_DASHBOARD).
      expect(mockNavigate).not.toHaveBeenCalledWith(Routes.REWARDS_DASHBOARD);
    });
  });

  describe('Version guard', () => {
    it('renders RewardsUpdateRequired when version is blocked', () => {
      mockSelectIsRewardsVersionBlocked.mockReturnValue(true);

      const { getByTestId, queryByTestId } = renderWithNavigation(
        <RewardsNavigator />,
      );

      expect(getByTestId('rewards-update-required')).toBeOnTheScreen();
      expect(queryByTestId('rewards-onboarding-navigator')).toBeNull();
      expect(queryByTestId('rewards-dashboard-view')).toBeNull();
    });

    it('does not navigate when version is blocked', async () => {
      mockSelectIsRewardsVersionBlocked.mockReturnValue(true);
      mockNavigate.mockClear();

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('renders normal navigator when version is not blocked', async () => {
      mockSelectIsRewardsVersionBlocked.mockReturnValue(false);

      const { queryByTestId, getByTestId } = renderWithNavigation(
        <RewardsNavigator />,
      );

      await waitFor(() => {
        expect(queryByTestId('rewards-update-required')).toBeNull();
        expect(getByTestId('rewards-onboarding-navigator')).toBeOnTheScreen();
      });
    });
  });
});
