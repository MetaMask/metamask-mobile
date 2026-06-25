import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import RewardsDashboard from './RewardsDashboard';
import Routes from '../../../../constants/navigation/Routes';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';
import { useOndoOutcomeToast } from '../hooks/useOndoOutcomeToast';
import { usePerpsTradingCampaignEndedOutcomeToast } from '../hooks/usePerpsTradingCampaignEndedOutcomeToast';
import { useGetPredictThePitchOutcomeToast } from '../hooks/useGetPredictThePitchOutcomeToast';

// Mock dependencies
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock navigation
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = effect();
        return cleanup;
      });
    },
  };
});

// Mock selectors
jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectActiveTab: jest.fn(),
  selectHasAcceptedVipInvite: jest.fn(),
  selectHasAcceptedVipRefereeInvite: jest.fn(),
  selectIsVipReferee: jest.fn(),
  selectHideCurrentAccountNotOptedInBannerArray: jest.fn(),
  selectHideUnlinkedAccountsBanner: jest.fn(),
  selectPendingDeeplink: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectIsCurrentSubscriptionVipEnabled: jest.fn(),
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/vipProgram', () => ({
  selectVipProgramEnabled: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroup: jest.fn(),
  }),
);

import {
  selectActiveTab,
  selectHasAcceptedVipInvite,
  selectHasAcceptedVipRefereeInvite,
  selectIsVipReferee,
  selectHideUnlinkedAccountsBanner,
  selectHideCurrentAccountNotOptedInBannerArray,
  selectPendingDeeplink,
} from '../../../../reducers/rewards/selectors';
// Real action creator (the rewards reducer module is intentionally not mocked),
// so the deeplink tests can assert the exact clear action dispatched.
import { setPendingDeeplink } from '../../../../reducers/rewards';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';

const mockSelectActiveTab = selectActiveTab as jest.MockedFunction<
  typeof selectActiveTab
>;
const mockSelectHasAcceptedVipInvite =
  selectHasAcceptedVipInvite as jest.MockedFunction<
    typeof selectHasAcceptedVipInvite
  >;
const mockSelectHasAcceptedVipRefereeInvite =
  selectHasAcceptedVipRefereeInvite as jest.MockedFunction<
    typeof selectHasAcceptedVipRefereeInvite
  >;
const mockSelectIsVipReferee = selectIsVipReferee as jest.MockedFunction<
  typeof selectIsVipReferee
>;
const mockHasAcceptedVipInviteSelector = jest.fn();
const mockHasAcceptedVipRefereeInviteSelector = jest.fn();
const mockSelectRewardsSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;
const mockSelectIsCurrentSubscriptionVipEnabled =
  selectIsCurrentSubscriptionVipEnabled as jest.MockedFunction<
    typeof selectIsCurrentSubscriptionVipEnabled
  >;
const mockSelectVipProgramEnabled =
  selectVipProgramEnabled as jest.MockedFunction<
    typeof selectVipProgramEnabled
  >;
const mockSelectHideUnlinkedAccountsBanner =
  selectHideUnlinkedAccountsBanner as jest.MockedFunction<
    typeof selectHideUnlinkedAccountsBanner
  >;
const mockSelectHideCurrentAccountNotOptedInBannerArray =
  selectHideCurrentAccountNotOptedInBannerArray as jest.MockedFunction<
    typeof selectHideCurrentAccountNotOptedInBannerArray
  >;
const mockSelectSelectedAccountGroup =
  selectSelectedAccountGroup as jest.MockedFunction<
    typeof selectSelectedAccountGroup
  >;
const mockSelectPendingDeeplink = selectPendingDeeplink as jest.MockedFunction<
  typeof selectPendingDeeplink
>;

// Mock react-native-safe-area-context
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../util/test/analyticsMock';
import { MetaMetricsEvents } from '../../../../core/Analytics';

// Mock useAnalytics hook
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));

jest.mock('../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../../../images/rewards/vip.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return function MockVipIcon() {
    return ReactActual.createElement(View, { testID: 'mock-vip-icon' });
  };
});

const mockControllerMessengerCall = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockControllerMessengerCall(...args),
    },
  },
}));

// Data hooks owned by the dashboard. They perform data fetching/side effects
// that are out of scope for these tests. The version guard now lives in
// RewardsHome (MainNavigator), so it is no longer mocked here.
jest.mock('../hooks/useCandidateSubscriptionId', () => ({
  useCandidateSubscriptionId: jest.fn(),
}));
jest.mock('../hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: jest.fn(),
}));
jest.mock('../hooks/useReferralDetails', () => ({
  useReferralDetails: jest.fn(),
}));

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.main_title': 'Rewards',
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

// Mock child components
jest.mock('../components/EarnRewards/EarnRewardsPreview', () => ({
  __esModule: true,
  default: function MockEarnRewardsPreview() {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'earn-rewards-preview' },
      ReactActual.createElement(Text, null, 'Earn Rewards Preview'),
    );
  },
}));

jest.mock('../components/Campaigns/CampaignsPreview', () => ({
  __esModule: true,
  default: function MockCampaignsPreview() {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'campaigns-preview' },
      ReactActual.createElement(Text, null, 'Campaigns Preview'),
    );
  },
}));

jest.mock('../components/Benefits/BenefitsPreview', () => ({
  __esModule: true,
  default: function MockBenefitsPreview() {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'benefits-preview' },
      ReactActual.createElement(Text, null, 'Benefits Preview'),
    );
  },
}));

// Mock hooks
jest.mock('../hooks/useRewardOptinSummary', () => ({
  useRewardOptinSummary: jest.fn(),
}));

jest.mock('../hooks/useRewardDashboardModals', () => ({
  useRewardDashboardModals: jest.fn(),
}));

jest.mock('../hooks/useBulkLinkState', () => ({
  useBulkLinkState: jest.fn(),
}));

jest.mock('../hooks/useOndoOutcomeToast', () => ({
  useOndoOutcomeToast: jest.fn(),
}));

jest.mock('../hooks/usePerpsTradingCampaignEndedOutcomeToast', () => ({
  usePerpsTradingCampaignEndedOutcomeToast: jest.fn(),
}));

jest.mock('../hooks/useGetPredictThePitchOutcomeToast', () => ({
  useGetPredictThePitchOutcomeToast: jest.fn(),
}));

// Import mocked hooks
import { useRewardOptinSummary } from '../hooks/useRewardOptinSummary';
import { useRewardDashboardModals } from '../hooks/useRewardDashboardModals';
import { useBulkLinkState } from '../hooks/useBulkLinkState';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';

const mockUseRewardOptinSummary = useRewardOptinSummary as jest.MockedFunction<
  typeof useRewardOptinSummary
>;
const mockUseRewardDashboardModals =
  useRewardDashboardModals as jest.MockedFunction<
    typeof useRewardDashboardModals
  >;
const mockUseBulkLinkState = useBulkLinkState as jest.MockedFunction<
  typeof useBulkLinkState
>;
const mockUseOndoOutcomeToast = useOndoOutcomeToast as jest.MockedFunction<
  typeof useOndoOutcomeToast
>;
const mockUsePerpsTradingCampaignEndedOutcomeToast =
  usePerpsTradingCampaignEndedOutcomeToast as jest.MockedFunction<
    typeof usePerpsTradingCampaignEndedOutcomeToast
  >;
const mockUseGetPredictThePitchOutcomeToast =
  useGetPredictThePitchOutcomeToast as jest.MockedFunction<
    typeof useGetPredictThePitchOutcomeToast
  >;

describe('RewardsDashboard', () => {
  const mockShowUnlinkedAccountsModal = jest.fn();
  const mockShowNotOptedInModal = jest.fn();
  const mockShowNotSupportedModal = jest.fn();
  const mockHasShownModal = jest.fn();
  const mockResumeBulkLink = jest.fn();

  const mockSelectedAccountGroup = {
    id: 'keyring:wallet1/1' as const,
    metadata: {
      name: 'Account Group 1',
      pinned: false,
      hidden: false,
      lastSelected: 0,
    },
    accounts: ['account-1'] as [string],
    type: AccountGroupType.SingleAccount as const,
  };

  const defaultSelectorValues = {
    activeTab: 'campaigns' as const,
    subscriptionId: 'test-subscription-id',
    isVipEnabled: false,
    isVipProgramEnabled: true,
    hideUnlinkedAccountsBanner: false,
    hideCurrentAccountNotOptedInBannerArray: [],
    selectedAccountGroup: mockSelectedAccountGroup,
  };

  const defaultHookValues = {
    useRewardOptinSummary: {
      byWallet: [],
      bySelectedAccountGroup: null,
      currentAccountGroupPartiallySupported: true,
      currentAccountGroupOptedInStatus: null,
      isLoading: false,
      hasError: false,
      refresh: jest.fn(),
    },
    useRewardDashboardModals: {
      showUnlinkedAccountsModal: mockShowUnlinkedAccountsModal,
      showNotOptedInModal: mockShowNotOptedInModal,
      showNotSupportedModal: mockShowNotSupportedModal,
      hasShownModal: mockHasShownModal,
      resetSessionTracking: jest.fn(),
      resetSessionTrackingForCurrentAccountGroup: jest.fn(),
      resetAllSessionTracking: jest.fn(),
    },
    useBulkLinkState: {
      startBulkLink: jest.fn(),
      cancelBulkLink: jest.fn(),
      resetBulkLink: jest.fn(),
      resumeBulkLink: mockResumeBulkLink,
      isRunning: false,
      wasInterrupted: false,
      isCompleted: false,
      hasFailures: false,
      isFullySuccessful: false,
      totalAccounts: 0,
      linkedAccounts: 0,
      failedAccounts: 0,
      accountProgress: 0,
      processedAccounts: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Configure mocks before passing them to the mock hook factory
    // so the hook receives already-configured references
    mockBuild.mockReturnValue({ event: 'mock-event' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });

    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );

    // Setup selector mocks
    mockSelectActiveTab.mockReturnValue(defaultSelectorValues.activeTab);
    mockSelectRewardsSubscriptionId.mockReturnValue(
      defaultSelectorValues.subscriptionId,
    );
    mockSelectIsCurrentSubscriptionVipEnabled.mockReturnValue(
      defaultSelectorValues.isVipEnabled,
    );
    mockSelectVipProgramEnabled.mockReturnValue(
      defaultSelectorValues.isVipProgramEnabled,
    );
    mockSelectHideUnlinkedAccountsBanner.mockReturnValue(
      defaultSelectorValues.hideUnlinkedAccountsBanner,
    );
    mockSelectHideCurrentAccountNotOptedInBannerArray.mockReturnValue(
      defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray,
    );
    mockSelectSelectedAccountGroup.mockReturnValue(
      defaultSelectorValues.selectedAccountGroup,
    );
    mockSelectHasAcceptedVipInvite.mockReturnValue(
      mockHasAcceptedVipInviteSelector,
    );
    mockSelectHasAcceptedVipRefereeInvite.mockReturnValue(
      mockHasAcceptedVipRefereeInviteSelector,
    );
    mockSelectIsVipReferee.mockReturnValue(false);
    mockHasAcceptedVipInviteSelector.mockReturnValue(false);
    mockHasAcceptedVipRefereeInviteSelector.mockReturnValue(false);

    // Setup hook mocks
    mockUseRewardOptinSummary.mockReturnValue(
      defaultHookValues.useRewardOptinSummary,
    );
    mockUseRewardDashboardModals.mockReturnValue(
      defaultHookValues.useRewardDashboardModals,
    );
    mockUseBulkLinkState.mockReturnValue(defaultHookValues.useBulkLinkState);

    // Setup default modal hook behavior - return false for all modal types by default
    mockHasShownModal.mockReturnValue(false);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectActiveTab) return defaultSelectorValues.activeTab;
      if (selector === selectRewardsSubscriptionId)
        return defaultSelectorValues.subscriptionId;
      if (selector === selectIsCurrentSubscriptionVipEnabled)
        return defaultSelectorValues.isVipEnabled;
      if (selector === selectVipProgramEnabled)
        return defaultSelectorValues.isVipProgramEnabled;
      if (selector === selectHideUnlinkedAccountsBanner)
        return defaultSelectorValues.hideUnlinkedAccountsBanner;
      if (selector === selectHideCurrentAccountNotOptedInBannerArray)
        return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
      if (selector === selectSelectedAccountGroup)
        return defaultSelectorValues.selectedAccountGroup;
      if (selector === mockHasAcceptedVipInviteSelector) return false;
      if (selector === selectIsVipReferee) return false;
      if (selector === mockHasAcceptedVipRefereeInviteSelector) return false;
      return undefined;
    });
  });

  describe('rendering', () => {
    it('renders main title', () => {
      // Act
      const { getByText } = render(<RewardsDashboard />);

      // Assert
      expect(getByText('Rewards')).toBeTruthy();
    });

    it('mounts campaign outcome toast hooks on render', () => {
      render(<RewardsDashboard />);

      expect(mockUseOndoOutcomeToast).toHaveBeenCalledTimes(1);
      expect(
        mockUsePerpsTradingCampaignEndedOutcomeToast,
      ).toHaveBeenCalledTimes(1);
      expect(mockUseGetPredictThePitchOutcomeToast).toHaveBeenCalledTimes(1);
    });

    it('renders all child components', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(getByTestId(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW)).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON)).toBeTruthy();
      expect(getByTestId('campaigns-preview')).toBeTruthy();
      expect(getByTestId('earn-rewards-preview')).toBeTruthy();
      expect(getByTestId('benefits-preview')).toBeTruthy();
    });

    it('calls modal hooks when component is rendered', () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockUseRewardDashboardModals).toHaveBeenCalled();
    });
  });

  describe('header and SafeAreaView', () => {
    it('renders SafeAreaView wrapper', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW),
      ).toBeOnTheScreen();
    });

    it('renders HeaderRoot with title Rewards', () => {
      // Act
      const { getByText } = render(<RewardsDashboard />);

      // Assert
      expect(getByText('Rewards')).toBeOnTheScreen();
    });

    it('renders settings button in header', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('navigates to Rewards settings when settings button is pressed', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );
      fireEvent.press(settingsButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
        screen: Routes.REWARDS_SETTINGS_VIEW,
        params: undefined,
      });
    });

    it('navigates to referral view when referral button is pressed', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      fireEvent.press(getByTestId(REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
        screen: Routes.REFERRAL_REWARDS_VIEW,
        params: undefined,
      });
    });

    it('does not render the VIP button when VIP is disabled', () => {
      const { queryByTestId } = render(<RewardsDashboard />);

      expect(queryByTestId(REWARDS_VIEW_SELECTORS.VIP_BUTTON)).toBeNull();
    });

    it('renders the VIP button when VIP is enabled', () => {
      mockSelectIsCurrentSubscriptionVipEnabled.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectIsCurrentSubscriptionVipEnabled) return true;
        if (selector === selectVipProgramEnabled) return true;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === mockHasAcceptedVipInviteSelector) return false;
        return undefined;
      });

      const { getByTestId } = render(<RewardsDashboard />);

      expect(getByTestId(REWARDS_VIEW_SELECTORS.VIP_BUTTON)).toBeOnTheScreen();
    });

    it('does not render the VIP button when the VIP program flag is off, even if the subscription is VIP', () => {
      mockSelectIsCurrentSubscriptionVipEnabled.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectIsCurrentSubscriptionVipEnabled) return true;
        if (selector === selectVipProgramEnabled) return false;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === mockHasAcceptedVipInviteSelector) return false;
        return undefined;
      });

      const { queryByTestId } = render(<RewardsDashboard />);

      expect(queryByTestId(REWARDS_VIEW_SELECTORS.VIP_BUTTON)).toBeNull();
    });

    it('navigates to VIP splash when the invite has not been accepted', () => {
      mockSelectIsCurrentSubscriptionVipEnabled.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectIsCurrentSubscriptionVipEnabled) return true;
        if (selector === selectVipProgramEnabled) return true;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === mockHasAcceptedVipInviteSelector) return false;
        return undefined;
      });

      const { getByTestId } = render(<RewardsDashboard />);
      fireEvent.press(getByTestId(REWARDS_VIEW_SELECTORS.VIP_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
        screen: Routes.REWARDS_VIP_SPLASH_VIEW,
        params: undefined,
      });
    });

    it('navigates to VIP view without splash when the invite was accepted', () => {
      mockSelectIsCurrentSubscriptionVipEnabled.mockReturnValue(true);
      mockHasAcceptedVipInviteSelector.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectIsCurrentSubscriptionVipEnabled) return true;
        if (selector === selectVipProgramEnabled) return true;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === mockHasAcceptedVipInviteSelector) return true;
        return undefined;
      });

      const { getByTestId } = render(<RewardsDashboard />);
      fireEvent.press(getByTestId(REWARDS_VIEW_SELECTORS.VIP_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
        screen: Routes.REWARDS_VIP_VIEW,
        params: undefined,
      });
    });

    it('does not render the VIP referee button when the user is not a VIP referee', () => {
      const { queryByTestId } = render(<RewardsDashboard />);

      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.VIP_REFEREE_BUTTON),
      ).toBeNull();
    });

    it('renders the VIP referee button when the user is a VIP referee', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectIsCurrentSubscriptionVipEnabled)
          return defaultSelectorValues.isVipEnabled;
        if (selector === selectVipProgramEnabled) return true;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === mockHasAcceptedVipInviteSelector) return false;
        if (selector === selectIsVipReferee) return true;
        if (selector === mockHasAcceptedVipRefereeInviteSelector) return false;
        return undefined;
      });

      const { getByTestId } = render(<RewardsDashboard />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.VIP_REFEREE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('navigates to VIP referee splash when the invite has not been accepted', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectIsCurrentSubscriptionVipEnabled)
          return defaultSelectorValues.isVipEnabled;
        if (selector === selectVipProgramEnabled) return true;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === mockHasAcceptedVipInviteSelector) return false;
        if (selector === selectIsVipReferee) return true;
        if (selector === mockHasAcceptedVipRefereeInviteSelector) return false;
        return undefined;
      });

      const { getByTestId } = render(<RewardsDashboard />);
      fireEvent.press(getByTestId(REWARDS_VIEW_SELECTORS.VIP_REFEREE_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
        screen: Routes.REWARDS_VIP_REFEREE_SPLASH_VIEW,
        params: undefined,
      });
    });

    it('navigates to VIP referee view without splash when the invite was accepted', () => {
      mockHasAcceptedVipRefereeInviteSelector.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectIsCurrentSubscriptionVipEnabled)
          return defaultSelectorValues.isVipEnabled;
        if (selector === selectVipProgramEnabled) return true;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === mockHasAcceptedVipInviteSelector) return false;
        if (selector === selectIsVipReferee) return true;
        if (selector === mockHasAcceptedVipRefereeInviteSelector) return true;
        return undefined;
      });

      const { getByTestId } = render(<RewardsDashboard />);
      fireEvent.press(getByTestId(REWARDS_VIEW_SELECTORS.VIP_REFEREE_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
        screen: Routes.REWARDS_VIP_REFEREE_VIEW,
        params: undefined,
      });
    });
  });

  describe('deeplink navigation', () => {
    // The dashboard reads the pending deeplink from Redux on mount and routes
    // into the corresponding rewards sub-page, then clears it so it does not
    // re-fire. navigateToRewardsRoute (not mocked) forwards through the
    // REWARDS_FLOW host, so mockNavigate receives that wrapper shape.
    const renderWithPendingDeeplink = (
      pendingDeeplink: Record<string, unknown> | null,
    ) => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectPendingDeeplink) return pendingDeeplink;
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectIsCurrentSubscriptionVipEnabled)
          return defaultSelectorValues.isVipEnabled;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === mockHasAcceptedVipInviteSelector) return false;
        return undefined;
      });
      return render(<RewardsDashboard />);
    };

    it.each([
      ['page', 'campaigns', Routes.REWARDS_CAMPAIGNS_VIEW],
      ['campaign', 'ondo', Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW],
      ['campaign', 'season1', Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW],
      [
        'campaign',
        'perps-comp',
        Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW,
      ],
      [
        'campaign',
        'predict-the-pitch',
        Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW,
      ],
      ['page', 'musd', Routes.REWARDS_MUSD_CALCULATOR_VIEW],
    ])(
      'routes %s=%s into the rewards flow and clears the pending deeplink',
      (key, value, expectedScreen) => {
        renderWithPendingDeeplink({ [key]: value });

        expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_FLOW, {
          screen: expectedScreen,
          params: undefined,
        });
        expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
      },
    );

    it('navigates directly to the benefits full view (registered at root) for page=benefits', () => {
      // Benefits is registered at the root MainNavigator level, so the dashboard
      // navigates directly rather than through the REWARDS_FLOW host.
      renderWithPendingDeeplink({ page: 'benefits' });

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.REWARD_BENEFITS_FULL_VIEW,
      );
      expect(mockDispatch).toHaveBeenCalledWith(setPendingDeeplink(null));
    });

    it('does nothing when there is no pending deeplink', () => {
      renderWithPendingDeeplink(null);

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
    });

    it('does not clear the pending deeplink for an unrecognized page/campaign', () => {
      // Unrecognized intents are preserved (not cleared) so they can be retried
      // rather than silently dropped.
      renderWithPendingDeeplink({ page: 'totally-unknown' });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalledWith(setPendingDeeplink(null));
    });
  });

  describe('referral button state', () => {
    it('always renders the referral button as enabled regardless of subscription state', () => {
      // Arrange - no subscriptionId
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId) return null;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const referralButton = getByTestId(
        REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
      );

      // Assert - referral button is never disabled
      expect(referralButton).not.toBeDisabled();
    });
  });

  describe('settings button state', () => {
    it('disables settings button when user is not opted in', () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId) return null;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );

      // Assert
      expect(settingsButton).toBeDisabled();
    });

    it('enables settings button when user is opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );

      // Assert
      expect(settingsButton).not.toBeDisabled();
    });
  });

  describe('modal triggering for current account', () => {
    it('shows not opted in modal when account group has opted out accounts and modal has not been shown', async () => {
      // Arrange
      const mockAccountGroupWithOptedOut = {
        id: 'keyring:wallet1/1' as const,
        name: 'Account Group 1',
        optedInAccounts: [],
        optedOutAccounts: [
          {
            id: 'account-1',
            address: '0x123',
            type: 'eip155:eoa' as const,
            options: {},
            metadata: {
              name: 'Account 1',
              importTime: Date.now(),
              keyring: { type: 'HD Key Tree' },
            },
            scopes: ['eip155:1'] as `${string}:${string}`[],
            methods: ['eth_sendTransaction'],
            hasOptedIn: false,
          },
        ],
        unsupportedAccounts: [],
      };

      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        bySelectedAccountGroup: mockAccountGroupWithOptedOut,
        currentAccountGroupPartiallySupported: true,
        currentAccountGroupOptedInStatus: 'notOptedIn',
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      await waitFor(() => {
        expect(mockShowNotOptedInModal).toHaveBeenCalled();
      });
    });

    it('shows not supported modal when account group is not fully supported and modal has not been shown', async () => {
      // Arrange
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountGroupPartiallySupported: false,
        currentAccountGroupOptedInStatus: null,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      await waitFor(() => {
        expect(mockShowNotSupportedModal).toHaveBeenCalled();
      });
    });

    it('does not show modal when modal has already been shown in session', () => {
      // Arrange
      mockHasShownModal.mockReturnValue(true);

      const mockAccountGroupWithOptedOut = {
        id: 'keyring:wallet1/1' as const,
        name: 'Account Group 1',
        optedInAccounts: [],
        optedOutAccounts: [
          {
            id: 'account-1',
            address: '0x123',
            type: 'eip155:eoa' as const,
            options: {},
            metadata: {
              name: 'Account 1',
              importTime: Date.now(),
              keyring: { type: 'HD Key Tree' },
            },
            scopes: ['eip155:1'] as `${string}:${string}`[],
            methods: ['eth_sendTransaction'],
            hasOptedIn: false,
          },
        ],
        unsupportedAccounts: [],
      };

      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        bySelectedAccountGroup: mockAccountGroupWithOptedOut,
        currentAccountGroupPartiallySupported: true,
        currentAccountGroupOptedInStatus: 'notOptedIn',
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
    });
  });

  describe('modal triggering for unlinked accounts', () => {
    const mockWalletWithOptedOutAccounts = [
      {
        wallet: {
          id: 'keyring:wallet1' as const,
          metadata: {
            name: 'Wallet 1',
          },
          groups: {},
          type: AccountWalletType.Keyring as const,
          status: 'in-progress:discovery' as const,
        },
        groups: [
          {
            id: 'keyring:wallet1/2' as const,
            name: 'Account Group 2',
            optedInAccounts: [],
            optedOutAccounts: [
              {
                id: 'account-2',
                address: '0x456',
                type: 'eip155:eoa' as const,
                options: {},
                metadata: {
                  name: 'Account 2',
                  importTime: Date.now(),
                  keyring: { type: 'HD Key Tree' },
                },
                scopes: ['eip155:1'] as `${string}:${string}`[],
                methods: ['eth_sendTransaction'],
                hasOptedIn: false,
              },
            ],
            unsupportedAccounts: [],
          },
        ],
      },
    ];

    it('shows unlinked accounts modal when there are unlinked accounts and user has subscription', async () => {
      // Arrange
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        byWallet: mockWalletWithOptedOutAccounts as any,
        currentAccountGroupOptedInStatus: 'fullyOptedIn',
        currentAccountGroupPartiallySupported: true,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      await waitFor(() => {
        expect(mockShowUnlinkedAccountsModal).toHaveBeenCalled();
      });
    });

    it('does not show unlinked accounts modal when hideUnlinkedAccountsBanner is true', () => {
      // Arrange
      mockSelectHideUnlinkedAccountsBanner.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectHideUnlinkedAccountsBanner) return true;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });

    it('does not show unlinked accounts modal when modal has already been shown', () => {
      // Arrange
      mockHasShownModal.mockImplementation(
        (modalType) => modalType === 'unlinked-accounts',
      );

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });
  });

  describe('modal prioritization', () => {
    it('shows unlinked accounts modal when current account banner dismissed and account group is fully opted in', async () => {
      // Arrange
      const mockWalletWithOptedOutAccounts = [
        {
          wallet: {
            id: 'keyring:wallet1' as const,
            metadata: {
              name: 'Wallet 1',
            },
            groups: {},
            type: AccountWalletType.Keyring as const,
            status: 'in-progress:discovery' as const,
          },
          groups: [
            {
              id: 'keyring:wallet1/2' as const,
              name: 'Account Group 2',
              optedInAccounts: [],
              optedOutAccounts: [
                {
                  id: 'account-2',
                  address: '0x456',
                  type: 'eip155:eoa' as const,
                  options: {},
                  metadata: {
                    name: 'Account 2',
                    importTime: Date.now(),
                    keyring: { type: 'HD Key Tree' },
                  },
                  scopes: ['eip155:1'] as `${string}:${string}`[],
                  methods: ['eth_sendTransaction'],
                  hasOptedIn: false,
                },
              ],
              unsupportedAccounts: [],
            },
          ],
        },
      ];

      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        byWallet: mockWalletWithOptedOutAccounts as any,
        currentAccountGroupOptedInStatus: 'fullyOptedIn',
        currentAccountGroupPartiallySupported: true,
      });

      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return [{ accountGroupId: 'keyring:wallet1/1', hide: true }];
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      await waitFor(() => {
        expect(mockShowUnlinkedAccountsModal).toHaveBeenCalled();
      });
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
    });

    it('prioritizes not supported modal over other modals', async () => {
      // Arrange
      const mockWalletWithOptedOutAccounts = [
        {
          wallet: {
            id: 'keyring:wallet1' as const,
            metadata: {
              name: 'Wallet 1',
            },
            groups: {},
            type: AccountWalletType.Keyring as const,
            status: 'in-progress:discovery' as const,
          },
          groups: [
            {
              id: 'keyring:wallet1/2' as const,
              name: 'Account Group 2',
              optedInAccounts: [],
              optedOutAccounts: [
                {
                  id: 'account-2',
                  address: '0x456',
                  type: 'eip155:eoa' as const,
                  options: {},
                  metadata: {
                    name: 'Account 2',
                    importTime: Date.now(),
                    keyring: { type: 'HD Key Tree' },
                  },
                  scopes: ['eip155:1'] as `${string}:${string}`[],
                  methods: ['eth_sendTransaction'],
                  hasOptedIn: false,
                },
              ],
              unsupportedAccounts: [],
            },
          ],
        },
      ];

      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        byWallet: mockWalletWithOptedOutAccounts as any,
        currentAccountGroupPartiallySupported: false,
        currentAccountGroupOptedInStatus: null,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      await waitFor(() => {
        expect(mockShowNotSupportedModal).toHaveBeenCalled();
      });
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });
  });

  describe('account group opt-in status logic', () => {
    it('does not show modal when account group is fully opted in', () => {
      // Arrange
      const mockAccountGroupFullyOptedIn = {
        id: 'keyring:wallet1/1' as const,
        name: 'Account Group 1',
        optedInAccounts: [
          {
            id: 'account-1',
            address: '0x123',
            type: 'eip155:eoa' as const,
            options: {},
            metadata: {
              name: 'Account 1',
              importTime: Date.now(),
              keyring: { type: 'HD Key Tree' },
            },
            scopes: ['eip155:1'] as `${string}:${string}`[],
            methods: ['eth_sendTransaction'],
            hasOptedIn: true,
          },
        ],
        optedOutAccounts: [],
        unsupportedAccounts: [],
      };

      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        bySelectedAccountGroup: mockAccountGroupFullyOptedIn,
        currentAccountGroupPartiallySupported: true,
        currentAccountGroupOptedInStatus: 'fullyOptedIn',
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowNotSupportedModal).not.toHaveBeenCalled();
    });

    it('shows not supported modal when account group contains unsupported accounts', async () => {
      // Arrange
      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountGroupPartiallySupported: false,
        currentAccountGroupOptedInStatus: null,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      await waitFor(() => {
        expect(mockShowNotSupportedModal).toHaveBeenCalled();
      });
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
    });

    it('handles null selectedAccountGroup gracefully', () => {
      // Arrange
      mockSelectSelectedAccountGroup.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup) return null;
        return undefined;
      });

      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        bySelectedAccountGroup: null,
        currentAccountGroupPartiallySupported: null,
        currentAccountGroupOptedInStatus: null,
      });

      // Act & Assert
      expect(() => render(<RewardsDashboard />)).not.toThrow();
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowNotSupportedModal).not.toHaveBeenCalled();
    });

    it('does not show modals when selectedAccountGroup has no id', () => {
      // Arrange
      mockSelectSelectedAccountGroup.mockReturnValue({
        ...mockSelectedAccountGroup,
        id: undefined as never,
      });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return { ...mockSelectedAccountGroup, id: undefined };
        return undefined;
      });

      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountGroupPartiallySupported: false,
        currentAccountGroupOptedInStatus: null,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowNotSupportedModal).not.toHaveBeenCalled();
    });
  });

  describe('hook integration', () => {
    it('calls useRewardDashboardModals hook', () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockUseRewardDashboardModals).toHaveBeenCalled();
    });
  });

  describe('metrics tracking', () => {
    it('tracks dashboard viewed event on mount', () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_DASHBOARD_VIEWED,
      );
      expect(mockBuild).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mock-event' });
    });

    it('tracks dashboard viewed event only once', () => {
      // Act
      const { rerender } = render(<RewardsDashboard />);

      // Count initial calls
      const initialCallCount = mockCreateEventBuilder.mock.calls.length;
      expect(initialCallCount).toBeGreaterThan(0);

      // Clear mocks to only count calls from rerender
      mockCreateEventBuilder.mockClear();
      mockBuild.mockClear();
      mockTrackEvent.mockClear();

      // Rerender should not trigger the event again due to ref guard
      rerender(<RewardsDashboard />);

      // Assert
      expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    });

    it('tracks tab viewed event when activeTab changes', () => {
      // Arrange
      const { rerender } = render(<RewardsDashboard />);
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockBuild.mockClear();

      // Act
      mockSelectActiveTab.mockReturnValue('activity');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'activity';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });
      rerender(<RewardsDashboard />);

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_DASHBOARD_TAB_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({ tab: 'activity' });
      expect(mockBuild).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mock-event' });
    });
  });

  describe('component lifecycle', () => {
    it('renders without crashing', () => {
      // Act & Assert
      expect(() => render(<RewardsDashboard />)).not.toThrow();
    });

    it('cleans up properly when unmounted', () => {
      // Act
      const { unmount } = render(<RewardsDashboard />);

      // Assert
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('bulk link auto-resume', () => {
    it('calls resumeBulkLink when wasInterrupted is true and isRunning is false', () => {
      // Arrange
      mockUseBulkLinkState.mockReturnValue({
        ...defaultHookValues.useBulkLinkState,
        wasInterrupted: true,
        isRunning: false,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockResumeBulkLink).toHaveBeenCalled();
    });

    it('does not call resumeBulkLink when wasInterrupted is false', () => {
      // Arrange
      mockUseBulkLinkState.mockReturnValue({
        ...defaultHookValues.useBulkLinkState,
        wasInterrupted: false,
        isRunning: false,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockResumeBulkLink).not.toHaveBeenCalled();
    });

    it('does not call resumeBulkLink when isRunning is true', () => {
      // Arrange
      mockUseBulkLinkState.mockReturnValue({
        ...defaultHookValues.useBulkLinkState,
        wasInterrupted: true,
        isRunning: true,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockResumeBulkLink).not.toHaveBeenCalled();
    });

    it('does not call resumeBulkLink when both wasInterrupted and isRunning are false', () => {
      // Arrange
      mockUseBulkLinkState.mockReturnValue({
        ...defaultHookValues.useBulkLinkState,
        wasInterrupted: false,
        isRunning: false,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockResumeBulkLink).not.toHaveBeenCalled();
    });

    it('does not call resumeBulkLink when both wasInterrupted and isRunning are true', () => {
      // Arrange
      mockUseBulkLinkState.mockReturnValue({
        ...defaultHookValues.useBulkLinkState,
        wasInterrupted: true,
        isRunning: true,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockResumeBulkLink).not.toHaveBeenCalled();
    });
  });

  describe('VIP unlock easter-egg (5 taps on title)', () => {
    const tapTitle = (
      getByTestId: (id: string) => ReturnType<typeof render>['getByTestId'],
      times: number,
    ) => {
      const node = getByTestId(
        REWARDS_VIEW_SELECTORS.TITLE,
      ) as unknown as Parameters<typeof fireEvent.press>[0];
      for (let i = 0; i < times; i++) {
        fireEvent.press(node);
      }
    };

    beforeEach(() => {
      jest.useFakeTimers();
      mockControllerMessengerCall.mockReset();
      mockControllerMessengerCall.mockResolvedValue(null);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calls getVIPDashboard once after 5 taps within the 3s window', async () => {
      // Arrange
      const { getByTestId } = render(<RewardsDashboard />);

      // Act — 5 quick taps
      tapTitle(getByTestId as never, 5);

      // Assert
      await waitFor(() => {
        expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
      });
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:getVIPDashboard',
        defaultSelectorValues.subscriptionId,
      );
    });

    it('does not call getVIPDashboard before reaching 5 taps', () => {
      // Arrange
      const { getByTestId } = render(<RewardsDashboard />);

      // Act
      tapTitle(getByTestId as never, 4);

      // Assert
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
    });

    it('does not trigger when the user is already VIP', () => {
      // Arrange
      mockSelectIsCurrentSubscriptionVipEnabled.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectIsCurrentSubscriptionVipEnabled) return true;
        if (selector === selectVipProgramEnabled) return true;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });
      const { getByTestId } = render(<RewardsDashboard />);

      // Act
      tapTitle(getByTestId as never, 5);

      // Assert
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
    });

    it('does not trigger when there is no subscription', () => {
      // Arrange
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId) return null;
        if (selector === selectIsCurrentSubscriptionVipEnabled)
          return defaultSelectorValues.isVipEnabled;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });
      const { getByTestId } = render(<RewardsDashboard />);

      // Act
      tapTitle(getByTestId as never, 5);

      // Assert
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
    });

    it('resets the tap counter after 3 seconds of inactivity', async () => {
      // Arrange
      const { getByTestId } = render(<RewardsDashboard />);

      // Act — 4 taps, then wait past the window, then 4 more
      tapTitle(getByTestId as never, 4);
      jest.advanceTimersByTime(3001);
      tapTitle(getByTestId as never, 4);

      // Assert — counter reset means we never reached 5 in a single window
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
    });

    it('only triggers once per dashboard visit', async () => {
      // Arrange
      const { getByTestId } = render(<RewardsDashboard />);

      // Act — first 5 taps trigger; another 5 should be ignored
      tapTitle(getByTestId as never, 5);
      await waitFor(() => {
        expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
      });
      tapTitle(getByTestId as never, 5);

      // Assert
      expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
    });

    it('releases the once-per-visit lock when the call rejects so it can be retried', async () => {
      // Arrange
      mockControllerMessengerCall.mockRejectedValueOnce(new Error('network'));
      const { getByTestId } = render(<RewardsDashboard />);

      // Act — first 5 taps fail; another 5 should be allowed
      tapTitle(getByTestId as never, 5);
      await waitFor(() => {
        expect(mockControllerMessengerCall).toHaveBeenCalledTimes(1);
      });
      tapTitle(getByTestId as never, 5);

      // Assert
      await waitFor(() => {
        expect(mockControllerMessengerCall).toHaveBeenCalledTimes(2);
      });
    });
  });
});
