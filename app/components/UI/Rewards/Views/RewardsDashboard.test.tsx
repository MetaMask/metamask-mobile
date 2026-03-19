import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import RewardsDashboard from './RewardsDashboard';
import Routes from '../../../../constants/navigation/Routes';
import { REWARDS_VIEW_SELECTORS } from './RewardsView.constants';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Mock navigation
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
    // Run focus effects as a normal effect during tests
    // This simulates the screen coming into focus
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
  selectSeasonId: jest.fn(),
  selectOptinAllowedForGeo: jest.fn(),
  selectHideCurrentAccountNotOptedInBannerArray: jest.fn(),
  selectHideUnlinkedAccountsBanner: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/rewards', () => ({
  selectCampaignsRewardsEnabledFlag: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroup: jest.fn(),
  }),
);

import {
  selectActiveTab,
  selectSeasonId,
  selectOptinAllowedForGeo,
  selectHideUnlinkedAccountsBanner,
  selectHideCurrentAccountNotOptedInBannerArray,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectCampaignsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';

const mockSelectActiveTab = selectActiveTab as jest.MockedFunction<
  typeof selectActiveTab
>;
const mockSelectRewardsSubscriptionId =
  selectRewardsSubscriptionId as jest.MockedFunction<
    typeof selectRewardsSubscriptionId
  >;
const mockSelectSeasonId = selectSeasonId as jest.MockedFunction<
  typeof selectSeasonId
>;
const mockSelectOptinAllowedForGeo =
  selectOptinAllowedForGeo as jest.MockedFunction<
    typeof selectOptinAllowedForGeo
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
const mockSelectCampaignsRewardsEnabledFlag =
  selectCampaignsRewardsEnabledFlag as jest.MockedFunction<
    typeof selectCampaignsRewardsEnabledFlag
  >;

// Mock theme
jest.mock('../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
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
    }) => ReactActual.createElement(View, { ...props, testID }, children),
  };
});

// Mock useMetrics hook
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
    isEnabled: jest.fn().mockReturnValue(true),
    enable: jest.fn(),
    addTraitsToUser: jest.fn(),
    createDataDeletionTask: jest.fn(),
    checkDataDeleteStatus: jest.fn(),
    getMetaMetricsId: jest.fn(),
    isDataRecorded: jest.fn().mockReturnValue(true),
    getDeleteRegulationId: jest.fn(),
    getDeleteRegulationCreationDate: jest.fn(),
  })),
  MetaMetricsEvents: {
    REWARDS_DASHBOARD_VIEWED: 'rewards_dashboard_viewed',
    REWARDS_DASHBOARD_TAB_VIEWED: 'rewards_dashboard_tab_viewed',
  },
}));

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
      'rewards.tab_overview_title': 'Overview',
      'rewards.tab_snapshots_title': 'Snapshots',
      'rewards.tab_activity_title': 'Activity',
      'rewards.not_implemented': 'Not implemented yet',
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

jest.mock('../components/PreviousSeason/PreviousSeasonSummary', () => ({
  __esModule: true,
  default: function MockPreviousSeasonSummary() {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'rewards-view-previous-season-summary' },
      ReactActual.createElement(Text, null, 'Previous Season Summary'),
    );
  },
}));

// Mock tab components
jest.mock('../components/Tabs/RewardsOverview', () => ({
  __esModule: true,
  default: function MockRewardsOverview({ tabLabel }: { tabLabel: string }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'rewards-overview-tab' },
      ReactActual.createElement(Text, null, tabLabel || 'Overview'),
    );
  },
}));

jest.mock('../Views/CampaignsView', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const MockCampaignsView = ({ tabLabel }: { tabLabel?: string }) =>
    ReactActual.createElement(
      RN.View,
      { testID: 'rewards-campaigns-tab' },
      ReactActual.createElement(RN.Text, null, tabLabel || 'Campaigns'),
    );
  return { __esModule: true, default: MockCampaignsView };
});

jest.mock('../components/Tabs/RewardsActivity', () => ({
  __esModule: true,
  default: function MockRewardsActivity({ tabLabel }: { tabLabel: string }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'rewards-activity-tab' },
      ReactActual.createElement(Text, null, tabLabel || 'Activity'),
    );
  },
}));

jest.mock('../components/Tabs/MusdCalculatorTab/MusdCalculatorTab', () => ({
  __esModule: true,
  default: function MockMusdCalculatorTab() {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'musd-calculator-tab' },
      ReactActual.createElement(Text, null, 'mUSD Calculator'),
    );
  },
}));

// Mock RewardsInfoBanner
jest.mock('../components/RewardsInfoBanner', () => ({
  __esModule: true,
  default: function MockRewardsInfoBanner({
    title,
    description,
    onConfirm,
    onDismiss,
    confirmButtonLabel,
    onConfirmLoading,
    testID,
  }: {
    title: string | React.ReactNode;
    description: string;
    onConfirm?: () => void;
    onDismiss?: () => void;
    confirmButtonLabel?: string;
    onConfirmLoading?: boolean;
    testID?: string;
  }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: testID || 'rewards-info-banner' },
      ReactActual.createElement(
        Text,
        { testID: 'banner-title' },
        typeof title === 'string' ? title : 'Custom Title',
      ),
      ReactActual.createElement(
        Text,
        { testID: 'banner-description' },
        description,
      ),
      onConfirm &&
        ReactActual.createElement(
          TouchableOpacity,
          {
            testID: 'banner-confirm-button',
            onPress: onConfirm,
            disabled: onConfirmLoading,
          },
          ReactActual.createElement(
            Text,
            null,
            onConfirmLoading ? 'Loading...' : confirmButtonLabel || 'Confirm',
          ),
        ),
      onDismiss &&
        ReactActual.createElement(
          TouchableOpacity,
          { testID: 'banner-dismiss-button', onPress: onDismiss },
          ReactActual.createElement(Text, null, 'Dismiss'),
        ),
    );
  },
}));

// Mock AccountDisplayItem
jest.mock('../components/AccountDisplayItem/AccountDisplayItem', () => ({
  __esModule: true,
  default: function MockAccountDisplayItem({
    account,
  }: {
    account: InternalAccount;
  }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'account-display-item' },
      ReactActual.createElement(
        Text,
        null,
        account?.metadata?.name || 'Account',
      ),
    );
  },
}));

// Mock hooks
jest.mock('../hooks/useRewardOptinSummary', () => ({
  useRewardOptinSummary: jest.fn(),
}));

jest.mock('../hooks/useLinkAccountGroup', () => ({
  useLinkAccountGroup: jest.fn(),
}));

jest.mock('../hooks/useRewardDashboardModals', () => ({
  useRewardDashboardModals: jest.fn(),
}));

jest.mock('../hooks/useBulkLinkState', () => ({
  useBulkLinkState: jest.fn(),
}));

jest.mock('../utils', () => ({
  convertInternalAccountToCaipAccountId: jest.fn(),
}));

// Mock TabsList with ref support
jest.mock('../../../../component-library/components-temp/Tabs', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

  const MockTabsList = ReactActual.forwardRef(
    (
      {
        children,
        onChangeTab,
        initialActiveIndex = 0,
        testID,
      }: {
        children: unknown;
        onChangeTab?: (props: { i: number; ref: unknown }) => void;
        initialActiveIndex?: number;
        testID?: string;
      },
      ref: unknown,
    ) => {
      const [activeTab, setActiveTabLocal] =
        ReactActual.useState(initialActiveIndex);

      ReactActual.useImperativeHandle(ref, () => ({
        goToTabIndex: (index: number) => {
          setActiveTabLocal(index);
          if (onChangeTab) {
            onChangeTab({ i: index, ref: children });
          }
        },
        getCurrentIndex: () => activeTab,
      }));

      const handleTabPress = (index: number) => {
        setActiveTabLocal(index);
        if (onChangeTab) {
          onChangeTab({ i: index, ref: children });
        }
      };

      // Filter and cast children to ReactElements
      const validChildren = ReactActual.Children.toArray(children).filter(
        (child: unknown) => ReactActual.isValidElement(child),
      );

      return ReactActual.createElement(
        View,
        { testID: testID || 'tabs-list' },
        // Tab headers
        ReactActual.createElement(
          View,
          { testID: 'tab-headers', style: { flexDirection: 'row' } },
          validChildren.map((child: unknown, index: number) => {
            if (!ReactActual.isValidElement(child)) return null;
            const childElement = child as {
              key?: string;
              props?: { tabLabel?: string };
            };
            return ReactActual.createElement(
              TouchableOpacity,
              {
                key: childElement.key || `tab-${index}`,
                testID: `tab-${index}`,
                onPress: () => handleTabPress(index),
                style: { padding: 10 },
              },
              ReactActual.createElement(
                Text,
                {
                  style: {
                    fontWeight: activeTab === index ? 'bold' : 'normal',
                  },
                },
                childElement.props?.tabLabel || `Tab ${index + 1}`,
              ),
            );
          }),
        ),
        // Active tab content
        ReactActual.createElement(
          View,
          { testID: 'tab-content' },
          validChildren[activeTab],
        ),
      );
    },
  );

  return {
    TabsList: MockTabsList,
  };
});

// Mock Alert
const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

// Import mocked hooks
import { useRewardOptinSummary } from '../hooks/useRewardOptinSummary';
import { useLinkAccountGroup } from '../hooks/useLinkAccountGroup';
import { useRewardDashboardModals } from '../hooks/useRewardDashboardModals';
import { useBulkLinkState } from '../hooks/useBulkLinkState';
import { convertInternalAccountToCaipAccountId } from '../utils';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';

const mockUseRewardOptinSummary = useRewardOptinSummary as jest.MockedFunction<
  typeof useRewardOptinSummary
>;
const mockUseLinkAccountGroup = useLinkAccountGroup as jest.MockedFunction<
  typeof useLinkAccountGroup
>;
const mockUseRewardDashboardModals =
  useRewardDashboardModals as jest.MockedFunction<
    typeof useRewardDashboardModals
  >;
const mockUseBulkLinkState = useBulkLinkState as jest.MockedFunction<
  typeof useBulkLinkState
>;
const mockConvertInternalAccountToCaipAccountId =
  convertInternalAccountToCaipAccountId as jest.MockedFunction<
    typeof convertInternalAccountToCaipAccountId
  >;

describe('RewardsDashboard', () => {
  const mockDispatch = jest.fn();
  const mockLinkAccount = jest.fn();
  const mockShowUnlinkedAccountsModal = jest.fn();
  const mockShowNotOptedInModal = jest.fn();
  const mockShowNotSupportedModal = jest.fn();
  const mockHasShownModal = jest.fn();
  const mockResetSessionTracking = jest.fn();
  const mockResumeBulkLink = jest.fn();
  const mockStartBulkLink = jest.fn();
  const mockCancelBulkLink = jest.fn();
  const mockResetBulkLink = jest.fn();

  const mockSelectedAccount = {
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
  };

  const mockSelectedAccountGroup = {
    id: 'keyring:wallet1/1' as const,
    metadata: {
      name: 'Account Group 1',
      pinned: false,
      hidden: false,
    },
    accounts: ['account-1'] as [string],
    type: AccountGroupType.SingleAccount as const,
  };

  const currentSeasonId = '7c9fa360-8d4c-425a-8a3e-7e82e1d82179';

  const defaultSelectorValues = {
    activeTab: 'campaigns' as const,
    subscriptionId: 'test-subscription-id',
    seasonId: currentSeasonId,
    optinAllowedForGeo: false as boolean | null,
    hideUnlinkedAccountsBanner: false,
    hideCurrentAccountNotOptedInBannerArray: [],
    selectedAccount: mockSelectedAccount,
    selectedAccountGroup: mockSelectedAccountGroup,
    isCampaignsEnabled: true,
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
    useLinkAccountGroup: {
      linkAccountGroup: mockLinkAccount,
      isLoading: false,
      isError: false,
      error: null,
    },
    useRewardDashboardModals: {
      showUnlinkedAccountsModal: mockShowUnlinkedAccountsModal,
      showNotOptedInModal: mockShowNotOptedInModal,
      showNotSupportedModal: mockShowNotSupportedModal,
      hasShownModal: mockHasShownModal,
      resetSessionTracking: mockResetSessionTracking,
      resetSessionTrackingForCurrentAccountGroup: jest.fn(),
      resetAllSessionTracking: jest.fn(),
    },
    useBulkLinkState: {
      startBulkLink: mockStartBulkLink,
      cancelBulkLink: mockCancelBulkLink,
      resetBulkLink: mockResetBulkLink,
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
    mockAlert.mockClear();
    mockLinkAccount.mockClear();
    mockShowUnlinkedAccountsModal.mockClear();
    mockShowNotOptedInModal.mockClear();
    mockShowNotSupportedModal.mockClear();
    mockHasShownModal.mockClear();
    mockResetSessionTracking.mockClear();
    mockResumeBulkLink.mockClear();
    mockStartBulkLink.mockClear();
    mockCancelBulkLink.mockClear();
    mockResetBulkLink.mockClear();
    mockTrackEvent.mockClear();
    mockCreateEventBuilder.mockClear();
    mockBuild.mockClear();
    mockAddProperties.mockClear();

    // Setup metrics mocks
    mockBuild.mockReturnValue({ event: 'mock-event' });
    mockAddProperties.mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });

    mockUseDispatch.mockReturnValue(mockDispatch);

    // Setup selector mocks
    mockSelectActiveTab.mockReturnValue(defaultSelectorValues.activeTab);
    mockSelectRewardsSubscriptionId.mockReturnValue(
      defaultSelectorValues.subscriptionId,
    );
    mockSelectSeasonId.mockReturnValue(defaultSelectorValues.seasonId);
    mockSelectHideUnlinkedAccountsBanner.mockReturnValue(
      defaultSelectorValues.hideUnlinkedAccountsBanner,
    );
    mockSelectHideCurrentAccountNotOptedInBannerArray.mockReturnValue(
      defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray,
    );

    mockSelectSelectedAccountGroup.mockReturnValue(
      defaultSelectorValues.selectedAccountGroup,
    );
    mockSelectCampaignsRewardsEnabledFlag.mockReturnValue(
      defaultSelectorValues.isCampaignsEnabled,
    );
    mockSelectOptinAllowedForGeo.mockReturnValue(
      defaultSelectorValues.optinAllowedForGeo,
    );

    // Setup hook mocks
    mockUseRewardOptinSummary.mockReturnValue(
      defaultHookValues.useRewardOptinSummary,
    );
    mockUseLinkAccountGroup.mockReturnValue(
      defaultHookValues.useLinkAccountGroup,
    );
    mockUseRewardDashboardModals.mockReturnValue(
      defaultHookValues.useRewardDashboardModals,
    );
    mockUseBulkLinkState.mockReturnValue(defaultHookValues.useBulkLinkState);
    mockConvertInternalAccountToCaipAccountId.mockReturnValue('eip155:1:0x123');

    // Setup default modal hook behavior - return false for all modal types by default
    mockHasShownModal.mockReturnValue(false);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectActiveTab) return defaultSelectorValues.activeTab;
      if (selector === selectRewardsSubscriptionId)
        return defaultSelectorValues.subscriptionId;
      if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
      if (selector === selectOptinAllowedForGeo)
        return defaultSelectorValues.optinAllowedForGeo;
      if (selector === selectHideUnlinkedAccountsBanner)
        return defaultSelectorValues.hideUnlinkedAccountsBanner;
      if (selector === selectHideCurrentAccountNotOptedInBannerArray)
        return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
      if (selector === selectSelectedAccountGroup)
        return defaultSelectorValues.selectedAccountGroup;
      if (selector === selectCampaignsRewardsEnabledFlag)
        return defaultSelectorValues.isCampaignsEnabled;
      return undefined;
    });
  });

  describe('rendering', () => {
    it('should render main title', () => {
      // Act
      const { getByText } = render(<RewardsDashboard />);

      // Assert
      expect(getByText('Rewards')).toBeTruthy();
    });

    it('should render all child components when user is opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(getByTestId(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW)).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON)).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON)).toBeTruthy();
      expect(getByTestId('campaigns-preview')).toBeTruthy();
    });

    it('should call modal hooks when component is rendered', () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockUseRewardDashboardModals).toHaveBeenCalled();
    });

    it('should render previous season summary when campaigns disabled and geo not allowed', () => {
      // Arrange - campaigns disabled, geo not allowed → just PreviousSeasonSummary
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectCampaignsRewardsEnabledFlag.mockReturnValue(false);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectOptinAllowedForGeo) return false;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag) return false;
        return undefined;
      });

      // Act
      const { getByTestId, queryByTestId } = render(<RewardsDashboard />);

      // Assert - PreviousSeasonSummary shown without tabs
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeTruthy();
      expect(queryByTestId('season-status')).toBeNull();
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeNull();
    });

    it('should not render previous season summary when campaigns enabled', () => {
      // isCampaignsEnabled is true (default) so showPreviousSeasonSummary is false
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectOptinAllowedForGeo) return true;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      // Act
      const { queryByTestId } = render(<RewardsDashboard />);

      // Assert - no previous season summary or tabs when season is active
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeNull();
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeNull();
    });

    it('should render campaigns preview and referral button when campaigns enabled', () => {
      // Act - defaults have campaigns enabled
      const { getByTestId, queryByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(getByTestId(REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON)).toBeTruthy();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeNull();
    });

    it('should not render previous season summary when seasonId is null', () => {
      // Arrange
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return null;
        if (selector === selectOptinAllowedForGeo)
          return defaultSelectorValues.optinAllowedForGeo;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      // Act
      const { queryByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeNull();
    });
  });

  describe('optinAllowedForGeo-based content', () => {
    it('shows mUSD calculator tab when campaigns disabled and geo allowed', () => {
      // Arrange - campaigns disabled + geo allowed
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectOptinAllowedForGeo) return true;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag) return false;
        return undefined;
      });

      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert - two-tab layout with mUSD and Previous Season
      expect(getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeTruthy();
      expect(getByTestId('musd-calculator-tab')).toBeTruthy();
    });

    it('hides mUSD calculator when campaigns disabled but geo not allowed', () => {
      // Arrange - campaigns disabled + geo NOT allowed
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectOptinAllowedForGeo) return false;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag) return false;
        return undefined;
      });

      // Act
      const { queryByTestId, getByTestId } = render(<RewardsDashboard />);

      // Assert - just PreviousSeasonSummary, no tabs
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeTruthy();
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeNull();
      expect(queryByTestId('musd-calculator-tab')).toBeNull();
    });

    it('shows campaigns preview when season is active regardless of geo', () => {
      // Act - defaults have active season with campaigns enabled
      const { queryByTestId, getByTestId } = render(<RewardsDashboard />);

      // Assert - CampaignsPreview shown, no previous season content
      expect(getByTestId('campaigns-preview')).toBeTruthy();
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeNull();
      expect(queryByTestId('musd-calculator-tab')).toBeNull();
    });
  });

  describe('header and SafeAreaView', () => {
    it('renders SafeAreaView wrapper', () => {
      const { getByTestId } = render(<RewardsDashboard />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW),
      ).toBeOnTheScreen();
    });

    it('renders HeaderRoot with title Rewards', () => {
      const { getByText } = render(<RewardsDashboard />);

      expect(getByText('Rewards')).toBeOnTheScreen();
    });

    it('renders settings button in header', () => {
      const { getByTestId } = render(<RewardsDashboard />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders referral button in header', () => {
      const { getByTestId } = render(<RewardsDashboard />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('should navigate to referral view when referral button is pressed', () => {
      const { getByTestId } = render(<RewardsDashboard />);
      const referralButton = getByTestId(
        REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
      );
      fireEvent.press(referralButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REFERRAL_REWARDS_VIEW);
    });

    it('navigates to Rewards settings when settings button is pressed', () => {
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );
      fireEvent.press(settingsButton);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.REWARDS_SETTINGS_VIEW);
    });
  });

  describe('when isCampaignsEnabled is false', () => {
    beforeEach(() => {
      mockSelectCampaignsRewardsEnabledFlag.mockReturnValue(false);
      mockSelectActiveTab.mockReturnValue('overview');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'overview';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag) return false;
        return undefined;
      });
    });

    it('does not render CampaignsPreview when campaigns is disabled', () => {
      // Act
      const { queryByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(queryByTestId('campaigns-preview')).toBeNull();
    });
  });

  describe('previous season summary', () => {
    const setupCampaignsDisabledMocks = (
      optinAllowed: boolean | null = false,
    ) => {
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectCampaignsRewardsEnabledFlag.mockReturnValue(false);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectOptinAllowedForGeo) return optinAllowed;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag) return false;
        return undefined;
      });
    };

    it('should show PreviousSeasonSummary when campaigns disabled and geo not allowed', () => {
      setupCampaignsDisabledMocks(false);

      const { getByTestId, queryByTestId } = render(<RewardsDashboard />);

      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeTruthy();
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeNull();
    });

    it('should show two-tab layout when campaigns disabled and geo allowed', () => {
      setupCampaignsDisabledMocks(true);

      const { getByTestId } = render(<RewardsDashboard />);

      expect(getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeTruthy();
      expect(getByTestId('musd-calculator-tab')).toBeTruthy();
    });

    it('should not render previous season summary when campaigns enabled', () => {
      // isCampaignsEnabled is true (default) so showPreviousSeasonSummary is false
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      // Act
      const { queryByTestId } = render(<RewardsDashboard />);

      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeNull();
    });

    it('should hide referral button when showing previous season summary', () => {
      // Arrange
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectCampaignsRewardsEnabledFlag.mockReturnValue(false);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag) return false;
        return undefined;
      });

      const { queryByTestId } = render(<RewardsDashboard />);

      expect(queryByTestId(REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON)).toBeNull();
    });

    it('should show settings button when showing previous season summary', () => {
      setupCampaignsDisabledMocks(false);
      // Arrange
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      const { getByTestId } = render(<RewardsDashboard />);

      expect(getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON)).toBeTruthy();
    });
  });

  describe('button states when not opted in', () => {
    beforeEach(() => {
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId) return null;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectOptinAllowedForGeo)
          return defaultSelectorValues.optinAllowedForGeo;
        if (selector === selectCampaignsRewardsEnabledFlag) return true;
        return undefined;
      });
    });

    it('should disable referral button when user is not opted in', () => {
      const { getByTestId } = render(<RewardsDashboard />);
      const referralButton = getByTestId(
        REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
      );
      const isDisabled =
        referralButton.props.disabled === true ||
        referralButton.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(true);
    });

    it('should disable settings button when user is not opted in', () => {
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );
      const isDisabled =
        settingsButton.props.disabled === true ||
        settingsButton.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(true);
    });
  });

  describe('button states when opted in', () => {
    it('should enable referral button when user is opted in', () => {
      const { getByTestId } = render(<RewardsDashboard />);
      const referralButton = getByTestId(
        REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
      );
      const isDisabled =
        referralButton.props.disabled === true ||
        referralButton.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(false);
    });

    it('should enable settings button when user is opted in', () => {
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );
      const isDisabled =
        settingsButton.props.disabled === true ||
        settingsButton.props.accessibilityState?.disabled === true;
      expect(isDisabled).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid activeTab gracefully', () => {
      // Arrange
      mockSelectActiveTab.mockReturnValue('nonexistent' as never);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'nonexistent';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectOptinAllowedForGeo)
          return defaultSelectorValues.optinAllowedForGeo;
        return undefined;
      });

      // Act & Assert
      expect(() => render(<RewardsDashboard />)).not.toThrow();
    });
  });

  describe('modal triggering for current account', () => {
    it('should show not opted in modal when account group has opted out accounts and modal has not been shown', async () => {
      // Arrange - Mock account group with opted out accounts
      // isCampaignsEnabled is true so showPreviousSeasonSummary is false
      // Note: The modal effect only runs when showPreviousSeasonSummary is false
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

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

      // Assert - Wait for effects to run
      await waitFor(() => {
        expect(mockShowNotOptedInModal).toHaveBeenCalled();
      });
    });

    it('should show not supported modal when account group is not fully supported and modal has not been shown', async () => {
      // Arrange - isCampaignsEnabled is true so showPreviousSeasonSummary is false
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountGroupPartiallySupported: false,
        currentAccountGroupOptedInStatus: null,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert - Wait for effects to run
      await waitFor(() => {
        expect(mockShowNotSupportedModal).toHaveBeenCalled();
      });
    });

    it('should not show modal when modal has already been shown in session', () => {
      // Arrange
      mockHasShownModal.mockReturnValue(true); // Modal already shown
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

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
    beforeEach(() => {
      // Set up default state for unlinked accounts modal tests
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
      });
    });

    it('should show unlinked accounts modal when there are unlinked accounts and user has subscription', async () => {
      // Arrange - Mock account group as fully opted in and has unlinked accounts
      // isCampaignsEnabled is true so showPreviousSeasonSummary is false
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

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

      // Act
      render(<RewardsDashboard />);

      // Assert - Wait for effects to run
      await waitFor(() => {
        expect(mockShowUnlinkedAccountsModal).toHaveBeenCalled();
      });
    });

    it('should not show unlinked accounts modal when hideUnlinkedAccountsBanner is true', () => {
      // Arrange
      mockSelectHideUnlinkedAccountsBanner.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
        if (selector === selectHideUnlinkedAccountsBanner) return true;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });

    it('should not show unlinked accounts modal when modal has already been shown', () => {
      // Arrange - setup mock to return true for unlinked accounts modal
      mockHasShownModal.mockImplementation(
        (modalType) => modalType === 'unlinked-accounts',
      );
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });
  });

  describe('modal prioritization', () => {
    it('should show unlinked accounts modal when current account banner dismissed and account group is fully opted in', async () => {
      // Arrange - Mock account group as fully opted in and banner dismissed
      // isCampaignsEnabled is true so showPreviousSeasonSummary is false
      mockSelectHideCurrentAccountNotOptedInBannerArray.mockReturnValue([
        { accountGroupId: 'keyring:wallet1/1' as const, hide: true },
      ]);

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
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return [{ accountGroupId: 'keyring:wallet1/1', hide: true }];
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      // Act
      render(<RewardsDashboard />);

      // Assert - Wait for effects to run
      await waitFor(() => {
        expect(mockShowUnlinkedAccountsModal).toHaveBeenCalled();
      });
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
    });

    it('should prioritize not supported modal over other modals', async () => {
      // Arrange - isCampaignsEnabled is true so showPreviousSeasonSummary is false
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

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

      // Assert - Wait for effects to run
      await waitFor(() => {
        expect(mockShowNotSupportedModal).toHaveBeenCalled();
      });
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });
  });

  describe('account group opt-in status logic', () => {
    it('should not show modal when account group is fully opted in', () => {
      // Arrange - Mock account group with all accounts opted in
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

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

    it('should show not supported modal when account group contains unsupported accounts', async () => {
      // Arrange - Mock account group with unsupported accounts
      // isCampaignsEnabled is true so showPreviousSeasonSummary is false
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      mockUseRewardOptinSummary.mockReturnValue({
        ...defaultHookValues.useRewardOptinSummary,
        currentAccountGroupPartiallySupported: false,
        currentAccountGroupOptedInStatus: null,
      });

      // Act
      render(<RewardsDashboard />);

      // Assert - Wait for effects to run
      await waitFor(() => {
        expect(mockShowNotSupportedModal).toHaveBeenCalled();
      });
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
    });

    it('should handle null selectedAccountGroup gracefully', () => {
      // Arrange - Mock null selectedAccountGroup
      mockSelectSelectedAccountGroup.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
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

      // Act & Assert - Should not throw error
      expect(() => render(<RewardsDashboard />)).not.toThrow();
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowNotSupportedModal).not.toHaveBeenCalled();
    });

    it('should not show not opted in modal when selectedAccountGroup has no id', () => {
      // Arrange - Mock selectedAccountGroup without id
      mockSelectSelectedAccountGroup.mockReturnValue({
        ...mockSelectedAccountGroup,
        id: undefined as never,
      });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return { ...mockSelectedAccountGroup, id: undefined };
        return undefined;
      });

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

      // Assert - Should not show modals when selectedAccountGroup has no id
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowNotSupportedModal).not.toHaveBeenCalled();
    });

    it('should not show not supported modal when selectedAccountGroup has no id', () => {
      // Arrange - Mock selectedAccountGroup without id
      mockSelectSelectedAccountGroup.mockReturnValue({
        ...mockSelectedAccountGroup,
        id: undefined as never,
      });
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
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

      // Assert - Should not show modals when selectedAccountGroup has no id
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowNotSupportedModal).not.toHaveBeenCalled();
    });
  });

  describe('early return conditions', () => {
    it('should return early and not show modals when seasonId is null', () => {
      // Arrange - Set seasonId to null
      mockSelectSeasonId.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return null;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      // Setup conditions that would normally trigger modals
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

      // Assert - Should return early, no modals should be shown
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowNotSupportedModal).not.toHaveBeenCalled();
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });

    it('should return early and not show modals when showPreviousSeasonSummary is true', () => {
      // Arrange - isCampaignsEnabled must be false for showPreviousSeasonSummary to be true
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectCampaignsRewardsEnabledFlag.mockReturnValue(false);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag) return false;
        return undefined;
      });

      // Setup conditions that would normally trigger modals
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

      // Assert - Should return early when showPreviousSeasonSummary is true, no modals should be shown
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowNotSupportedModal).not.toHaveBeenCalled();
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });

    it('should return early and not show modals when showPreviousSeasonSummary is null', () => {
      // Arrange - Set seasonId to null so showPreviousSeasonSummary is null
      // This tests the case where the useFocusEffect hasn't evaluated yet
      mockSelectSeasonId.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return null;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      // Setup conditions that would normally trigger modals
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

      // Assert - Should return early when showPreviousSeasonSummary is null, no modals should be shown
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
      expect(mockShowNotSupportedModal).not.toHaveBeenCalled();
      expect(mockShowUnlinkedAccountsModal).not.toHaveBeenCalled();
    });
  });

  describe('hook integration', () => {
    it('should call useRewardDashboardModals hook', () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockUseRewardDashboardModals).toHaveBeenCalled();
    });
  });

  describe('metrics tracking', () => {
    it('should track dashboard viewed event on mount', () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'rewards_dashboard_viewed',
      );
      expect(mockBuild).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mock-event' });
    });

    it('should track dashboard viewed event only once', () => {
      // Act - Render component once
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

      // Assert - should not be called again after initial render
      // The ref guard prevents multiple calls
      expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    });

    it('tracks tab viewed event when activeTab changes', () => {
      // Arrange
      const { rerender } = render(<RewardsDashboard />);
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockBuild.mockClear();

      // Act - change active tab from campaigns to activity
      mockSelectActiveTab.mockReturnValue('activity');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'activity';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectOptinAllowedForGeo)
          return defaultSelectorValues.optinAllowedForGeo;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });
      rerender(<RewardsDashboard />);

      // Assert
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        'rewards_dashboard_tab_viewed',
      );
      expect(mockAddProperties).toHaveBeenCalledWith({ tab: 'activity' });
      expect(mockBuild).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mock-event' });
    });

    it('tracks tab viewed event for each tab change', () => {
      // Arrange
      const { rerender } = render(<RewardsDashboard />);
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockBuild.mockClear();
      mockAddProperties.mockClear();

      // Act - change to activity tab
      mockSelectActiveTab.mockReturnValue('activity');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'activity';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectOptinAllowedForGeo)
          return defaultSelectorValues.optinAllowedForGeo;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });
      rerender(<RewardsDashboard />);

      // Assert - activity tab
      expect(mockAddProperties).toHaveBeenCalledWith({ tab: 'activity' });

      // Act - change back to campaigns tab
      mockSelectActiveTab.mockReturnValue('campaigns');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'campaigns';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectOptinAllowedForGeo)
          return defaultSelectorValues.optinAllowedForGeo;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });
      rerender(<RewardsDashboard />);

      // Assert - campaigns tab
      expect(mockAddProperties).toHaveBeenCalledWith({ tab: 'campaigns' });
    });
  });

  describe('TabsList ref functionality', () => {
    it('handles Redux state changes for activeTab without crashing', () => {
      // Arrange
      mockSelectActiveTab.mockReturnValue('campaigns');
      const { rerender } = render(<RewardsDashboard />);

      // Act - change activeTab in Redux to campaigns
      mockSelectActiveTab.mockReturnValue('campaigns');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'campaigns';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        if (selector === selectCampaignsRewardsEnabledFlag)
          return defaultSelectorValues.isCampaignsEnabled;
        return undefined;
      });

      // Assert - does not crash when activeTab changes
      expect(() => rerender(<RewardsDashboard />)).not.toThrow();
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
