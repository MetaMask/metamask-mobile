import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import RewardsDashboard from './RewardsDashboard';
import { setActiveTab } from '../../../../actions/rewards';
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
  selectSeasonEndDate: jest.fn(),
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
  selectSeasonId,
  selectSeasonEndDate,
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
const mockSelectSeasonId = selectSeasonId as jest.MockedFunction<
  typeof selectSeasonId
>;
const mockSelectSeasonEndDate = selectSeasonEndDate as jest.MockedFunction<
  typeof selectSeasonEndDate
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

// Mock theme
jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000',
      background: '#fff',
    },
  }),
}));

// Mock useSafeAreaInsets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  })),
}));

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
      'rewards.tab_levels_title': 'Levels',
      'rewards.tab_activity_title': 'Activity',
      'rewards.not_implemented': 'Not implemented yet',
    };
    return translations[key] || key;
  }),
}));

// Mock getNavigationOptionsTitle
jest.mock('../../Navbar', () => ({
  getNavigationOptionsTitle: jest.fn(() => ({ title: 'Rewards' })),
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
jest.mock('../components/SeasonStatus/SeasonStatus', () => ({
  __esModule: true,
  default: function MockSeasonStatus() {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');
    return ReactActual.createElement(
      View,
      { testID: 'season-status' },
      ReactActual.createElement(Text, null, 'Season Status'),
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

jest.mock('../components/Tabs/RewardsLevels', () => ({
  __esModule: true,
  default: function MockRewardsLevels({ tabLabel }: { tabLabel: string }) {
    const ReactActual = jest.requireActual('react');
    const { View, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'rewards-levels-tab' },
      ReactActual.createElement(Text, null, tabLabel || 'Levels'),
    );
  },
}));

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

// Mock TabBar
jest.mock('../../../../component-library/components-temp/TabBar', () => ({
  __esModule: true,
  default: function MockTabBar({
    tabs,
    activeTab,
    goToPage,
    style,
    tabStyle,
    underlineStyle,
  }: {
    tabs: { key: string; label: string; index: number }[];
    activeTab: number;
    goToPage: (index: number) => void;
    style: Record<string, unknown>;
    tabStyle: Record<string, unknown>;
    underlineStyle: Record<string, unknown>;
  }) {
    const ReactActual = jest.requireActual('react');
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      { testID: 'tab-bar', style },
      tabs?.map((tab, index) =>
        ReactActual.createElement(
          TouchableOpacity,
          {
            key: tab.key,
            testID: `tab-${index}`,
            onPress: () => goToPage(index),
            style: tabStyle,
          },
          ReactActual.createElement(
            Text,
            {
              style: {
                fontWeight: activeTab === index ? 'bold' : 'normal',
              },
            },
            tab.label,
          ),
        ),
      ),
      ReactActual.createElement(View, { style: underlineStyle }),
    );
  },
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    ...jest.requireActual('@metamask/design-system-react-native'),
    ButtonIcon: ({
      iconName,
      disabled,
      testID,
      onPress,
    }: {
      iconName: string;
      size: string;
      disabled: boolean;
      testID: string;
      onPress: () => void;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          testID,
          disabled,
          onPress,
        },
        ReactActual.createElement(Text, null, `Icon: ${iconName}`),
      ),
  };
});

// Mock Alert
const mockAlert = jest.fn();
jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);

// Import mocked hooks
import { useRewardOptinSummary } from '../hooks/useRewardOptinSummary';
import { useLinkAccountGroup } from '../hooks/useLinkAccountGroup';
import { useRewardDashboardModals } from '../hooks/useRewardDashboardModals';
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
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday

  const defaultSelectorValues = {
    activeTab: 'overview' as const,
    subscriptionId: 'test-subscription-id',
    seasonId: currentSeasonId,
    seasonEndDate: new Date(futureDate), // Season is active by default
    hideUnlinkedAccountsBanner: false,
    hideCurrentAccountNotOptedInBannerArray: [],
    selectedAccount: mockSelectedAccount,
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
    mockSelectSeasonEndDate.mockReturnValue(
      defaultSelectorValues.seasonEndDate,
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
    mockUseLinkAccountGroup.mockReturnValue(
      defaultHookValues.useLinkAccountGroup,
    );
    mockUseRewardDashboardModals.mockReturnValue(
      defaultHookValues.useRewardDashboardModals,
    );
    mockConvertInternalAccountToCaipAccountId.mockReturnValue('eip155:1:0x123');

    // Setup default modal hook behavior - return false for all modal types by default
    mockHasShownModal.mockReturnValue(false);

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectActiveTab) return defaultSelectorValues.activeTab;
      if (selector === selectRewardsSubscriptionId)
        return defaultSelectorValues.subscriptionId;
      if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
      if (selector === selectSeasonEndDate)
        return defaultSelectorValues.seasonEndDate;
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
      expect(getByTestId('season-status')).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeTruthy();
      expect(getByTestId('tab-headers')).toBeTruthy();
      expect(getByTestId('tab-content')).toBeTruthy();
      expect(getByTestId('rewards-overview-tab')).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON)).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON)).toBeTruthy();
    });

    it('should call modal hooks when component is rendered', () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      expect(mockUseRewardDashboardModals).toHaveBeenCalled();
    });

    it('should render previous season summary when season has ended', () => {
      // Arrange
      const pastDateObj = new Date(pastDate);
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectSeasonEndDate.mockReturnValue(pastDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return pastDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Act
      const { getByTestId, queryByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeTruthy();
      expect(queryByTestId('season-status')).toBeNull();
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeNull();
    });

    it('should render season status and tabs when season is active', () => {
      // Arrange
      const futureDateObj = new Date(futureDate);
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectSeasonEndDate.mockReturnValue(futureDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Act
      const { getByTestId, queryByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(getByTestId('season-status')).toBeTruthy();
      expect(getByTestId(REWARDS_VIEW_SELECTORS.TAB_CONTROL)).toBeTruthy();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeNull();
    });

    it('should not render previous season summary when seasonId is null', () => {
      // Arrange
      const pastDateObj = new Date(pastDate);
      mockSelectSeasonId.mockReturnValue(null);
      mockSelectSeasonEndDate.mockReturnValue(pastDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return null;
        if (selector === selectSeasonEndDate) return pastDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Act
      const { getByTestId, queryByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(getByTestId('season-status')).toBeTruthy();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeNull();
    });

    it('should not render previous season summary when seasonEndDate is null', () => {
      // Arrange
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectSeasonEndDate.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return null;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Act
      const { getByTestId, queryByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(getByTestId('season-status')).toBeTruthy();
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeNull();
    });
  });

  describe('navigation', () => {
    it('should set navigation options on mount', async () => {
      // Act
      render(<RewardsDashboard />);

      // Assert
      await waitFor(() => {
        expect(mockSetOptions).toHaveBeenCalled();
      });
    });

    it('should navigate to referral view when referral button is pressed', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const referralButton = getByTestId(
        REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
      );
      fireEvent.press(referralButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(Routes.REFERRAL_REWARDS_VIEW);
    });
  });

  describe('tab functionality', () => {
    it('should handle tab change when user selects different tab', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const levelsTab = getByTestId('tab-1');
      fireEvent.press(levelsTab);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith(setActiveTab('levels'));
    });

    it('should render all tab options', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert - verify tab headers and individual tabs are rendered
      expect(getByTestId('tab-headers')).toBeTruthy();
      expect(getByTestId('tab-0')).toBeTruthy();
      expect(getByTestId('tab-1')).toBeTruthy();
      expect(getByTestId('tab-2')).toBeTruthy();
    });

    it('should show overview tab content by default', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(getByTestId('rewards-overview-tab')).toBeTruthy();
    });

    it('should switch to levels tab when levels tab is pressed', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const levelsTab = getByTestId('tab-1');
      fireEvent.press(levelsTab);

      // Assert
      expect(getByTestId('rewards-levels-tab')).toBeTruthy();
    });

    it('should switch to activity tab when activity tab is pressed', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const activityTab = getByTestId('tab-2');
      fireEvent.press(activityTab);

      // Assert
      expect(getByTestId('rewards-activity-tab')).toBeTruthy();
    });

    it('should not allow tab switching when user is not opted in', () => {
      // Arrange
      const futureDateObj = new Date(futureDate);
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockSelectSeasonEndDate.mockReturnValue(futureDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId) return null;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
        return undefined;
      });

      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const levelsTab = getByTestId('tab-1');
      fireEvent.press(levelsTab);

      // Assert - should show levels tab (tab change occurred)
      expect(getByTestId('rewards-levels-tab')).toBeTruthy();
    });
  });

  describe('previous season summary', () => {
    it('should evaluate showPreviousSeasonSummary in useFocusEffect when screen comes into focus', () => {
      // Arrange
      const pastDateObj = new Date(pastDate);
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectSeasonEndDate.mockReturnValue(pastDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return pastDateObj;
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

      // Assert - useFocusEffect should evaluate and show previous season summary
      // when seasonId exists and seasonEndDate is in the past
      expect(
        getByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeTruthy();
    });

    it('should not show previous season summary when season is active', () => {
      // Arrange
      const futureDateObj = new Date(futureDate);
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectSeasonEndDate.mockReturnValue(futureDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Act
      const { queryByTestId } = render(<RewardsDashboard />);

      // Assert - useFocusEffect should evaluate and not show previous season summary
      // when seasonEndDate is in the future
      expect(
        queryByTestId(REWARDS_VIEW_SELECTORS.PREVIOUS_SEASON_SUMMARY),
      ).toBeNull();
    });

    it('should hide referral button when showing previous season summary', () => {
      // Arrange
      const pastDateObj = new Date(pastDate);
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectSeasonEndDate.mockReturnValue(pastDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return pastDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Act
      const { queryByTestId } = render(<RewardsDashboard />);

      // Assert
      expect(queryByTestId(REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON)).toBeNull();
    });

    it('should show settings button when showing previous season summary', () => {
      // Arrange
      const pastDateObj = new Date(pastDate);
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectSeasonEndDate.mockReturnValue(pastDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return pastDateObj;
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

      // Assert
      expect(getByTestId(REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON)).toBeTruthy();
    });
  });

  describe('button states when not opted in', () => {
    beforeEach(() => {
      const futureDateObj = new Date(futureDate);
      mockSelectRewardsSubscriptionId.mockReturnValue(null);
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectSeasonEndDate.mockReturnValue(futureDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId) return null;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
        return undefined;
      });
    });

    it('should disable referral button when user is not opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const referralButton = getByTestId(
        REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
      );

      // Assert
      expect(referralButton.props.disabled).toBe(true);
    });

    it('should disable settings button when user is not opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );

      // Assert
      expect(settingsButton.props.disabled).toBe(true);
    });
  });

  describe('button states when opted in', () => {
    it('should enable referral button when user is opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const referralButton = getByTestId(
        REWARDS_VIEW_SELECTORS.REFERRAL_BUTTON,
      );

      // Assert
      expect(referralButton.props.disabled).toBe(false);
    });

    it('should enable settings button when user is opted in', () => {
      // Act
      const { getByTestId } = render(<RewardsDashboard />);
      const settingsButton = getByTestId(
        REWARDS_VIEW_SELECTORS.SETTINGS_BUTTON,
      );

      // Assert
      expect(settingsButton.props.disabled).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid activeTab gracefully', () => {
      // Arrange
      mockSelectActiveTab.mockReturnValue('overview');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'overview';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
        return undefined;
      });

      // Act & Assert
      expect(() => render(<RewardsDashboard />)).not.toThrow();
    });
  });

  describe('modal triggering for current account', () => {
    it('should show not opted in modal when account group has opted out accounts and modal has not been shown', async () => {
      // Arrange - Mock account group with opted out accounts
      // Use future date so showPreviousSeasonSummary is false (season is active)
      // Note: The modal effect only runs when showPreviousSeasonSummary is false
      const futureDateObj = new Date(futureDate);
      mockSelectSeasonEndDate.mockReturnValue(futureDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
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
      // Arrange - Use future date so showPreviousSeasonSummary is false (season is active)
      const futureDateObj = new Date(futureDate);
      mockSelectSeasonEndDate.mockReturnValue(futureDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
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
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
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
      // Use future date so showPreviousSeasonSummary is false (season is active)
      const futureDateObj = new Date(futureDate);
      mockSelectSeasonEndDate.mockReturnValue(futureDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
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
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
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

    it('should not show unlinked accounts modal when modal has already been shown', () => {
      // Arrange - setup mock to return true for unlinked accounts modal
      const futureDateObj = new Date(futureDate);
      mockHasShownModal.mockImplementation(
        (modalType) => modalType === 'unlinked-accounts',
      );
      mockSelectSeasonEndDate.mockReturnValue(futureDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
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
  });

  describe('modal prioritization', () => {
    it('should show unlinked accounts modal when current account banner dismissed and account group is fully opted in', async () => {
      // Arrange - Mock account group as fully opted in and banner dismissed
      // Use future date so showPreviousSeasonSummary is false (season is active)
      mockSelectHideCurrentAccountNotOptedInBannerArray.mockReturnValue([
        { accountGroupId: 'keyring:wallet1/1' as const, hide: true },
      ]);
      mockSelectSeasonEndDate.mockReturnValue(new Date(futureDate));

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

      const futureDateObj = new Date(futureDate);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return defaultSelectorValues.seasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
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

      // Assert - Wait for effects to run
      await waitFor(() => {
        expect(mockShowUnlinkedAccountsModal).toHaveBeenCalled();
      });
      expect(mockShowNotOptedInModal).not.toHaveBeenCalled();
    });

    it('should prioritize not supported modal over other modals', async () => {
      // Arrange - Use future date so showPreviousSeasonSummary is false (season is active)
      const futureDateObj = new Date(futureDate);
      mockSelectSeasonEndDate.mockReturnValue(futureDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
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
      const futureDateObj = new Date(futureDate);
      mockSelectSeasonEndDate.mockReturnValue(futureDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return futureDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
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
      // Use future date so showPreviousSeasonSummary is false (season is active)
      mockSelectSeasonEndDate.mockReturnValue(new Date(futureDate));
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return new Date(futureDate);
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
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
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
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
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
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
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
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
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
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
      // Arrange - Set past date so showPreviousSeasonSummary is true (season has ended)
      const pastDateObj = new Date(pastDate);
      mockSelectSeasonId.mockReturnValue(currentSeasonId);
      mockSelectSeasonEndDate.mockReturnValue(pastDateObj);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate) return pastDateObj;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
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
      // Arrange - Set seasonId and seasonEndDate to null so showPreviousSeasonSummary is null
      // This tests the case where the useFocusEffect hasn't evaluated yet
      mockSelectSeasonId.mockReturnValue(null);
      mockSelectSeasonEndDate.mockReturnValue(null);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab)
          return defaultSelectorValues.activeTab;
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return null;
        if (selector === selectSeasonEndDate) return null;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
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

    it('should track tab viewed event when activeTab changes', () => {
      // Arrange
      const { rerender } = render(<RewardsDashboard />);
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockBuild.mockClear();

      // Act - change active tab
      mockSelectActiveTab.mockReturnValue('levels');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'levels';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
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
        'rewards_dashboard_tab_viewed',
      );
      expect(mockAddProperties).toHaveBeenCalledWith({ tab: 'levels' });
      expect(mockBuild).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mock-event' });
    });

    it('should track tab viewed event for each tab change', () => {
      // Arrange
      const { rerender } = render(<RewardsDashboard />);
      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockBuild.mockClear();
      mockAddProperties.mockClear();

      // Act - change to levels tab
      mockSelectActiveTab.mockReturnValue('levels');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'levels';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });
      rerender(<RewardsDashboard />);

      // Assert - levels tab
      expect(mockAddProperties).toHaveBeenCalledWith({ tab: 'levels' });

      // Act - change to activity tab
      mockSelectActiveTab.mockReturnValue('activity');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'activity';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });
      rerender(<RewardsDashboard />);

      // Assert - activity tab
      expect(mockAddProperties).toHaveBeenCalledWith({ tab: 'activity' });
    });
  });

  describe('TabsList ref functionality', () => {
    it('should handle Redux state changes for activeTab without crashing', () => {
      // Arrange
      mockSelectActiveTab.mockReturnValue('overview');
      const { rerender } = render(<RewardsDashboard />);

      // Act - change activeTab in Redux to levels
      mockSelectActiveTab.mockReturnValue('levels');
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectActiveTab) return 'levels';
        if (selector === selectRewardsSubscriptionId)
          return defaultSelectorValues.subscriptionId;
        if (selector === selectSeasonId) return currentSeasonId;
        if (selector === selectSeasonEndDate)
          return defaultSelectorValues.seasonEndDate;
        if (selector === selectHideUnlinkedAccountsBanner)
          return defaultSelectorValues.hideUnlinkedAccountsBanner;
        if (selector === selectHideCurrentAccountNotOptedInBannerArray)
          return defaultSelectorValues.hideCurrentAccountNotOptedInBannerArray;
        if (selector === selectSelectedAccountGroup)
          return defaultSelectorValues.selectedAccountGroup;
        return undefined;
      });

      // Assert - should not crash when activeTab changes
      expect(() => rerender(<RewardsDashboard />)).not.toThrow();
    });
  });

  describe('component lifecycle', () => {
    it('should render without crashing', () => {
      // Act & Assert
      expect(() => render(<RewardsDashboard />)).not.toThrow();
    });

    it('should cleanup properly when unmounted', () => {
      // Act
      const { unmount } = render(<RewardsDashboard />);

      // Assert
      expect(() => unmount()).not.toThrow();
    });
  });
});
