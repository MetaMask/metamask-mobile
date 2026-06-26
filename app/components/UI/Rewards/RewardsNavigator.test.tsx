import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

jest.mock('./Views/RewardsVipView', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockRewardsVipView() {
    return ReactActual.createElement(
      View,
      { testID: 'rewards-vip-view' },
      ReactActual.createElement(Text, null, 'Rewards VIP View'),
    );
  };
});

jest.mock('./Views/RewardsVipSplashView', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return function MockRewardsVipSplashView() {
    return ReactActual.createElement(
      View,
      { testID: 'rewards-vip-splash-view' },
      ReactActual.createElement(Text, null, 'Rewards VIP Splash View'),
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
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockSetOptions = jest.fn();
const mockSetParams = jest.fn();
const mockIsFocused = jest.fn();
const mockReactReduxDispatch = jest.fn();
const mockUseNavigationState = jest.fn(
  (selector: (state: unknown) => unknown): unknown =>
    selector({ routes: [{}], index: 0 }),
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
      setOptions: mockSetOptions,
      setParams: mockSetParams,
    }),
    useIsFocused: () => mockIsFocused(),
    useNavigationState: (selector: (state: unknown) => unknown) =>
      mockUseNavigationState(selector),
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

// Mock useRewardsNotificationsNudge hook
const mockShowEnableNotificationsNudge = jest.fn(() => false);
const mockCloseEnableNotificationsNudge = jest.fn();
jest.mock('./hooks/useRewardsNotificationsNudge', () => ({
  useRewardsNotificationsNudge: jest.fn(() => ({
    areNotificationsEnabled: true,
    canPromptToEnableNotifications: false,
    shouldPromptToEnableNotifications: false,
    showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
    closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
    runAfterNotificationsEnabled: jest.fn(),
  })),
}));

// Mock useRewardsToast hook
const mockNavigatorShowToast = jest.fn();
const mockSuccessToast = jest.fn(() => ({ variant: 'success' }));
jest.mock('./hooks/useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: mockNavigatorShowToast,
    RewardsToastOptions: {
      success: mockSuccessToast,
      error: jest.fn(),
      loading: jest.fn(),
      entriesClosed: jest.fn(),
      enableNotificationsNudge: jest.fn(),
      outcomeWinner: jest.fn(),
      outcomeNonWinner: jest.fn(),
    },
  })),
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
import { useGeoRewardsMetadata } from './hooks/useGeoRewardsMetadata';
import { useCandidateSubscriptionId } from './hooks/useCandidateSubscriptionId';
import { useRewardsNotificationsNudge } from './hooks/useRewardsNotificationsNudge';
import useRewardsVersionGuard from './hooks/useRewardsVersionGuard';

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

const mockUseGeoRewardsMetadata = useGeoRewardsMetadata as jest.MockedFunction<
  typeof useGeoRewardsMetadata
>;
const mockUseCandidateSubscriptionId =
  useCandidateSubscriptionId as jest.MockedFunction<
    typeof useCandidateSubscriptionId
  >;
const mockUseRewardsNotificationsNudge =
  useRewardsNotificationsNudge as jest.MockedFunction<
    typeof useRewardsNotificationsNudge
  >;
const mockUseRewardsVersionGuard =
  useRewardsVersionGuard as jest.MockedFunction<typeof useRewardsVersionGuard>;

describe('RewardsNavigator', () => {
  let store: ReturnType<typeof configureStore>;
  const Stack = createNativeStackNavigator();

  beforeEach(() => {
    jest.clearAllMocks();

    // Set default mock return values. The navigator only renders screens for
    // subscribed users now (dashboard/onboarding routing moved up to
    // MainNavigator), so default to a subscription to keep the stack populated.
    mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');
    mockCanGoBack.mockReturnValue(true);
    mockSelectPendingDeeplink.mockReturnValue(null);
    mockUseGeoRewardsMetadata.mockReturnValue({
      fetchGeoRewardsMetadata: jest.fn(),
    });
    mockUseRewardsVersionGuard.mockReturnValue({
      fetchVersionRequirements: jest.fn(),
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

  describe('Version guard refresh key', () => {
    it('passes the active Rewards route to the version guard', () => {
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            index: 0,
            routes: [
              {
                name: Routes.REWARDS_VIEW,
                state: {
                  index: 1,
                  routes: [
                    { name: Routes.REWARDS_DASHBOARD },
                    { name: Routes.REWARDS_CAMPAIGNS_VIEW },
                  ],
                },
              },
            ],
          }),
      );

      renderWithNavigation(<RewardsNavigator />);

      expect(mockUseRewardsVersionGuard).toHaveBeenCalledWith({
        refreshKey: Routes.REWARDS_CAMPAIGNS_VIEW,
      });
    });
  });

  describe('Stack Navigator Configuration', () => {
    it('renders the first sub-page (referral view) for users with subscription', async () => {
      // Dashboard/onboarding routing moved up to MainNavigator. RewardsNavigator
      // now only registers the rewards sub-pages, which are present only when the
      // user is enrolled. The referral view is the first registered screen.
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(getByTestId('rewards-referral-view')).toBeOnTheScreen();
      });
    });

    it('does not render dashboard route (owned by MainNavigator now)', async () => {
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');

      const { queryByTestId } = renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(queryByTestId('rewards-dashboard-view')).toBeNull();
      });
    });
  });

  describe('Lost subscription recovery', () => {
    // REWARDS_FLOW can stay mounted after an account switch or opt-out. When the
    // subscription disappears, the navigator must neither render an empty native
    // stack (which throws) nor leave stale sub-page routes registered; instead it
    // dismisses the flow.
    it('does not render any sub-page screen when subscription is absent', async () => {
      mockSelectRewardsSubscriptionId.mockReturnValue(null);

      const { queryByTestId } = renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(queryByTestId('rewards-referral-view')).toBeNull();
        expect(queryByTestId('rewards-dashboard-view')).toBeNull();
      });
    });

    it('dismisses the flow when subscription is absent', async () => {
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockGoBack.mockClear();
      mockCanGoBack.mockReturnValue(true);

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockGoBack).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call goBack when the flow cannot be dismissed', async () => {
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockGoBack.mockClear();
      mockCanGoBack.mockReturnValue(false);

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockCanGoBack).toHaveBeenCalled();
      });
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('does not dismiss the flow while a subscription exists', async () => {
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');
      mockGoBack.mockClear();

      const { getByTestId } = renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(getByTestId('rewards-referral-view')).toBeOnTheScreen();
      });
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('Hooks integration', () => {
    it('does not call useCandidateSubscriptionId hook (owned by the dashboard)', () => {
      // The tab-level data hooks now live on RewardsDashboard (the Rewards tab
      // entry), which stays mounted while this pushed flow is open. Re-running
      // them here would duplicate the focus-driven fetches.
      mockUseCandidateSubscriptionId.mockClear();

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert
      expect(mockUseCandidateSubscriptionId).not.toHaveBeenCalled();
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

      // Assert - Just verify it renders the first sub-page screen
      expect(getByTestId('rewards-referral-view')).toBeDefined();
    });

    it('does not call useGeoRewardsMetadata hook (owned by the dashboard)', () => {
      mockUseGeoRewardsMetadata.mockClear();

      // Act
      renderWithNavigation(<RewardsNavigator />);

      // Assert
      expect(mockUseGeoRewardsMetadata).not.toHaveBeenCalled();
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
        expect(getByTestId('rewards-referral-view')).toBeOnTheScreen();
      });
    });
  });

  describe('Notification nudge behavior', () => {
    beforeEach(() => {
      mockSelectRewardsSubscriptionId.mockReturnValue('test-subscription-id');
      mockSelectPendingDeeplink.mockReturnValue(null);
      mockSelectIsRewardsVersionBlocked.mockReturnValue(false);
      mockUseGeoRewardsMetadata.mockReturnValue({
        fetchGeoRewardsMetadata: jest.fn(),
      });
    });

    it('does not show nudge when canPromptToEnableNotifications is false', async () => {
      mockUseRewardsNotificationsNudge.mockReturnValue({
        areNotificationsEnabled: false,
        canPromptToEnableNotifications: false,
        shouldPromptToEnableNotifications: false,
        showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
        closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
        runAfterNotificationsEnabled: jest.fn(),
      });
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            routes: [
              {
                state: {
                  routes: [{ name: Routes.REWARDS_CAMPAIGNS_VIEW }],
                  index: 0,
                },
              },
            ],
            index: 0,
          }),
      );

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => expect(true).toBe(true));
      expect(mockShowEnableNotificationsNudge).not.toHaveBeenCalled();
    });

    it('does not show nudge when notifications are already enabled', async () => {
      mockUseRewardsNotificationsNudge.mockReturnValue({
        areNotificationsEnabled: true,
        canPromptToEnableNotifications: true,
        shouldPromptToEnableNotifications: false,
        showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
        closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
        runAfterNotificationsEnabled: jest.fn(),
      });
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            routes: [
              {
                state: {
                  routes: [{ name: Routes.REWARDS_CAMPAIGNS_VIEW }],
                  index: 0,
                },
              },
            ],
            index: 0,
          }),
      );

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => expect(true).toBe(true));
      expect(mockShowEnableNotificationsNudge).not.toHaveBeenCalled();
    });

    it('does not show nudge when not on a campaign route', async () => {
      mockUseRewardsNotificationsNudge.mockReturnValue({
        areNotificationsEnabled: false,
        canPromptToEnableNotifications: true,
        shouldPromptToEnableNotifications: true,
        showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
        closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
        runAfterNotificationsEnabled: jest.fn(),
      });
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            routes: [
              {
                state: {
                  routes: [{ name: Routes.REWARDS_DASHBOARD }],
                  index: 0,
                },
              },
            ],
            index: 0,
          }),
      );

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => expect(true).toBe(true));
      expect(mockShowEnableNotificationsNudge).not.toHaveBeenCalled();
    });

    it('does not show nudge when showEnableNotificationsNudge returns false', async () => {
      mockUseRewardsNotificationsNudge.mockReturnValue({
        areNotificationsEnabled: false,
        canPromptToEnableNotifications: true,
        shouldPromptToEnableNotifications: true,
        showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
        closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
        runAfterNotificationsEnabled: jest.fn(),
      });
      mockShowEnableNotificationsNudge.mockReturnValue(false);
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            routes: [
              {
                state: {
                  routes: [{ name: Routes.REWARDS_CAMPAIGNS_VIEW }],
                  index: 0,
                },
              },
            ],
            index: 0,
          }),
      );

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockShowEnableNotificationsNudge).toHaveBeenCalledTimes(1);
      });
      expect(mockCloseEnableNotificationsNudge).not.toHaveBeenCalled();
    });

    it('shows nudge on campaign route and closes it when navigating away', async () => {
      mockUseRewardsNotificationsNudge.mockReturnValue({
        areNotificationsEnabled: false,
        canPromptToEnableNotifications: true,
        shouldPromptToEnableNotifications: true,
        showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
        closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
        runAfterNotificationsEnabled: jest.fn(),
      });
      mockShowEnableNotificationsNudge.mockReturnValue(true);
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            routes: [
              {
                state: {
                  routes: [{ name: Routes.REWARDS_CAMPAIGNS_VIEW }],
                  index: 0,
                },
              },
            ],
            index: 0,
          }),
      );

      const { rerender } = renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(mockShowEnableNotificationsNudge).toHaveBeenCalledTimes(1);
      });

      // Navigate away to a non-campaign route
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            routes: [
              {
                state: {
                  routes: [{ name: Routes.REWARDS_DASHBOARD }],
                  index: 0,
                },
              },
            ],
            index: 0,
          }),
      );

      await act(async () => {
        rerender(buildNavWrapper(<RewardsNavigator />));
      });

      expect(mockCloseEnableNotificationsNudge).toHaveBeenCalledTimes(1);
    });

    it('does not show nudge again when session flag is already set', async () => {
      mockUseRewardsNotificationsNudge.mockReturnValue({
        areNotificationsEnabled: false,
        canPromptToEnableNotifications: true,
        shouldPromptToEnableNotifications: true,
        showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
        closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
        runAfterNotificationsEnabled: jest.fn(),
      });
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            routes: [
              {
                state: {
                  routes: [{ name: Routes.REWARDS_CAMPAIGNS_VIEW }],
                  index: 0,
                },
              },
            ],
            index: 0,
          }),
      );

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => expect(true).toBe(true));
      // sessionNotificationsNudgeShown was set true by the previous test
      expect(mockShowEnableNotificationsNudge).not.toHaveBeenCalled();
    });

    it('evaluates route conditions for ONDO campaign route', async () => {
      mockUseRewardsNotificationsNudge.mockReturnValue({
        areNotificationsEnabled: false,
        canPromptToEnableNotifications: true,
        shouldPromptToEnableNotifications: true,
        showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
        closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
        runAfterNotificationsEnabled: jest.fn(),
      });
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            routes: [
              {
                state: {
                  routes: [{ name: Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW }],
                  index: 0,
                },
              },
            ],
            index: 0,
          }),
      );

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => expect(true).toBe(true));
      // session flag already set — nudge not reshown, but route conditions were evaluated
      expect(mockShowEnableNotificationsNudge).not.toHaveBeenCalled();
    });

    it('evaluates route conditions for SeasonOne campaign route', async () => {
      mockUseRewardsNotificationsNudge.mockReturnValue({
        areNotificationsEnabled: false,
        canPromptToEnableNotifications: true,
        shouldPromptToEnableNotifications: true,
        showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
        closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
        runAfterNotificationsEnabled: jest.fn(),
      });
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            routes: [
              {
                state: {
                  routes: [
                    {
                      name: Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW,
                    },
                  ],
                  index: 0,
                },
              },
            ],
            index: 0,
          }),
      );

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => expect(true).toBe(true));
      expect(mockShowEnableNotificationsNudge).not.toHaveBeenCalled();
    });

    it('evaluates route conditions for Perps Trading campaign route', async () => {
      mockUseRewardsNotificationsNudge.mockReturnValue({
        areNotificationsEnabled: false,
        canPromptToEnableNotifications: true,
        shouldPromptToEnableNotifications: true,
        showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
        closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
        runAfterNotificationsEnabled: jest.fn(),
      });
      mockUseNavigationState.mockImplementation(
        (selector: (state: unknown) => unknown) =>
          selector({
            routes: [
              {
                state: {
                  routes: [
                    {
                      name: Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW,
                    },
                  ],
                  index: 0,
                },
              },
            ],
            index: 0,
          }),
      );

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => expect(true).toBe(true));
      expect(mockShowEnableNotificationsNudge).not.toHaveBeenCalled();
    });

    it('calls success toast when onNotificationsEnabled callback fires', async () => {
      let capturedCallback: (() => void) | undefined;
      mockUseRewardsNotificationsNudge.mockImplementation(
        (options: { onNotificationsEnabled?: () => void } = {}) => {
          capturedCallback = options.onNotificationsEnabled;
          return {
            areNotificationsEnabled: false,
            canPromptToEnableNotifications: true,
            shouldPromptToEnableNotifications: true,
            showEnableNotificationsNudge: mockShowEnableNotificationsNudge,
            closeEnableNotificationsNudge: mockCloseEnableNotificationsNudge,
            runAfterNotificationsEnabled: jest.fn(),
          };
        },
      );

      renderWithNavigation(<RewardsNavigator />);

      await waitFor(() => {
        expect(capturedCallback).toBeDefined();
      });

      act(() => {
        capturedCallback?.();
      });

      expect(mockNavigatorShowToast).toHaveBeenCalledTimes(1);
      expect(mockSuccessToast).toHaveBeenCalledWith(
        'rewards.notifications_nudge.success',
      );
    });
  });
});
