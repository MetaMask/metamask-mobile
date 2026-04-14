import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import RewardsDashboard from './RewardsDashboard';
import Routes from '../../../../constants/navigation/Routes';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
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
  selectHideCurrentAccountNotOptedInBannerArray: jest.fn(),
  selectHideUnlinkedAccountsBanner: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroup: jest.fn(),
  }),
);

import {
  selectActiveTab,
  selectHideUnlinkedAccountsBanner,
  selectHideCurrentAccountNotOptedInBannerArray,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';

const mockSelectActiveTab = selectActiveTab as jest.MockedFunction<
  typeof selectActiveTab
>;
const mockSelectRewardsSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
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

// Mock Toast component
jest.mock('../../../../component-library/components/Toast', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ReactActual.forwardRef(
      (
        _props: Record<string, unknown>,
        ref: React.Ref<{ showToast: jest.Mock }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          showToast: jest.fn(),
          closeToast: jest.fn(),
        }));
        return ReactActual.createElement(ReactActual.Fragment, null, 'Toast');
      },
    ),
  };
});

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
    mockSelectHideUnlinkedAccountsBanner.mockReturnValue(
      defaultSelectorValues.hideUnlinkedAccountsBanner,
    );
    mockSelectHideCurrentAccountNotOptedInBannerArray.mockReturnValue(
      defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray,
    );
    mockSelectSelectedAccountGroup.mockReturnValue(
      defaultSelectorValues.selectedAccountGroup,
    );

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
      if (selector === selectHideUnlinkedAccountsBanner)
        return defaultSelectorValues.hideUnlinkedAccountsBanner;
      if (selector === selectHideCurrentAccountNotOptedInBannerArray)
        return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
      if (selector === selectSelectedAccountGroup)
        return defaultSelectorValues.selectedAccountGroup;
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

    it('renders all child components', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(getByTestId(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW)).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON)).toBeTruthy();
      expect(getByTestId('campaigns-preview')).toBeTruthy();
      expect(getByTestId('earn-rewards-preview')).toBeTruthy();
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
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_SETTINGS_VIEW);
    });

    it('navigates to referral view when referral button is pressed', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      fireEvent.press(getByTestId(REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON));

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REFERRAL_REWARDS_VIEW);
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
      const isDisabled =
        referralButton.props.disabled === true ||
        referralButton.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(false);
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
      const isDisabled =
        settingsButton.props.disabled === true ||
        settingsButton.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(true);
    });

    it('enables settings button when user is opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );

      // Assert
      const isDisabled =
        settingsButton.props.disabled === true ||
        settingsButton.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(false);
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
});
